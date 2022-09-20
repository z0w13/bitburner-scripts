import { NS, Server } from "@ns"
import { tail } from "/lib/util"
import { DAEMON_SERVER } from "/config"
import { JobType } from "/JobScheduler/JobObjects"
import getScriptPid from "/lib/func/get-script-pid"
import getTargets, { getTarget, Target } from "/lib/func/get-targets"
import renderTable from "/lib/func/render-table"
import setupPolyfill from "/lib/ns-polyfill"
import { formatDate, formatMoney, formatNum, formatTime, renderProgress, sortFunc } from "/lib/util"

interface AutobestState {
  target: Target | undefined
  type: JobType.HackWeakenGrowWeaken | JobType.Batch | undefined
  pid: number
  lastSwitch: number | undefined
}

function getState(ns: NS): AutobestState {
  const current: AutobestState = {
    target: undefined,
    type: undefined,
    pid: 0,
    lastSwitch: undefined,
  }

  current.pid = getScriptPid(ns, "plan-batch.js", DAEMON_SERVER)

  if (current.pid === 0) {
    current.pid = getScriptPid(ns, "/libexec/basic-hwgw.js", DAEMON_SERVER)
  } else {
    current.type = JobType.Batch
  }

  if (current.pid > 0) {
    const script = ns.getRunningScript(current.pid)
    if (!script) {
      return current
    }

    const targetFlagIdx = script.args.indexOf("--target")
    if (targetFlagIdx > -1) {
      current.target = getTarget(ns, script.args[targetFlagIdx + 1].toString())
    }
  }

  return current
}

function getNextSwitch(state: AutobestState) {
  if (state.lastSwitch && state.target) {
    return state.lastSwitch + state.target.weakenTime + 600_000
  }

  return Date.now()
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")
  ns.enableLog("exec")

  const state = getState(ns)

  while (true) {
    await ns.asleep(1000)

    // If for some reason script exited, reset state
    if (!ns.getRunningScript(state.pid)) {
      state.pid = 0
      state.target = undefined
      state.lastSwitch = undefined
    }

    const nextSwitch = getNextSwitch(state)

    const table = [
      ["Time", formatDate(ns, new Date(), false)],
      ["Next Switch", formatDate(ns, new Date(nextSwitch), false)],
      ["Remaining", formatTime(nextSwitch - Date.now(), false)],
      ["Target", state.target?.name],
      ["Profit/s", formatMoney(ns, state.target?.optimalProfit ?? 0)],
      ["Type", state.type],
    ]

    if (state.target) {
      const targetInfo: Server = ns.getServer(state.target?.name)
      table.push([
        "Security",
        ns.sprintf(
          "%s/%s/%s",
          formatNum(ns, targetInfo.minDifficulty, "0,0"),
          formatNum(ns, targetInfo.baseDifficulty, "0,0"),
          formatNum(ns, targetInfo.hackDifficulty, "0,0.00"),
        ),
      ])
      table.push([
        "",
        "[" + renderProgress({ value: targetInfo.hackDifficulty, min: targetInfo.minDifficulty, max: 100 }) + "]",
      ])
      table.push([
        "Money (Curr/Max/%)",
        ns.sprintf(
          "%s/%s/%s%%",
          formatMoney(ns, targetInfo.moneyAvailable),
          formatMoney(ns, targetInfo.moneyMax),
          formatNum(ns, (targetInfo.moneyAvailable / targetInfo.moneyMax) * 100),
        ),
      ])
      table.push(["", "[" + renderProgress({ value: targetInfo.moneyAvailable, max: targetInfo.moneyMax }) + "]"])
    }

    ns.clearLog()
    ns.print(renderTable(ns, table, false))

    const logs = ns.getRunningScript(state.pid)?.logs
    if (logs) {
      tail(ns, logs)
    }

    if (nextSwitch > Date.now() && state.pid > 0) {
      continue
    }

    const bestTarget =
      getTargets(ns)
        .filter((t) => t.openPorts >= t.openPortsReq)
        .sort(sortFunc((t) => t.optimalProfit))
        .at(-1) ?? getTarget(ns, "n00dles")

    if (bestTarget.name === state.target?.name && bestTarget.optimalType === state.type && state.pid > 0) {
      state.lastSwitch = Date.now()
      continue
    }

    if (state.pid > 0) {
      ns.kill(state.pid)
      state.pid = 0
    }

    state.type = bestTarget.optimalType
    state.pid = ns.exec(
      state.type === JobType.Batch ? "plan-batch.js" : "/libexec/basic-hwgw.js",
      DAEMON_SERVER,
      1,
      "--target",
      bestTarget.name,
    )
    state.target = bestTarget
    state.lastSwitch = Date.now()
  }
}
