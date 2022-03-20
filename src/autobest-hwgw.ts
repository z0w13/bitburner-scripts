import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import getScriptPid from "/lib/func/get-script-pid"
import getTargets, { getTarget, Target } from "/lib/func/get-targets"
import setupPolyfill from "/lib/ns-polyfill"
import { formatDate, formatTime, sortFunc } from "/lib/util"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")
  ns.enableLog("exec")

  let script = "batch-hwgw.js"
  let currentPid = getScriptPid(ns, script, DAEMON_SERVER)

  if (currentPid === 0) {
    script = "basic-hwgw.js"
    currentPid = getScriptPid(ns, script, DAEMON_SERVER)
  }

  let currentScript = script
  let currentTarget: Target | undefined
  let lastSwitch: number | undefined

  if (currentPid > 0) {
    const script = ns.getRunningScript(currentPid)
    const targetFlagIdx = script.args.indexOf("--target")
    if (targetFlagIdx > -1) {
      currentTarget = getTarget(ns, script.args[targetFlagIdx + 1])
    }
  }

  while (true) {
    await ns.asleep(1000)

    // If for some reason script exited, reset currentPid/currentTarget
    if (!ns.getRunningScript(currentPid)) {
      currentPid = 0
      currentTarget = undefined
      lastSwitch = undefined
    }

    const nextSwitch = lastSwitch && currentTarget ? lastSwitch + currentTarget.weakenTime + 600_000 : Date.now()

    ns.print(
      "Next Switch: ",
      formatDate(ns, new Date(nextSwitch), false),
      " | Current Time: ",
      formatDate(ns, new Date(), false),
      " | Time Remaining: ",
      formatTime(nextSwitch - Date.now()),
      " | Switching: ",
      nextSwitch <= Date.now(),
      " | Active: ",
      currentPid > 0,
      " | Current Target: ",
      currentTarget?.name,
    )

    if (nextSwitch > Date.now() && currentPid > 0) {
      continue
    }

    const targets = getTargets(ns)
      .filter((t) => t.openPorts >= t.openPortsReq)
      .filter((t) => t.weakenTime < 200_000)
      .sort(sortFunc((t) => t.profitPerSecond))

    let bestTarget: Target

    if (!targets.at(-1)) {
      const basicTargets = getTargets(ns, true)
        .filter((t) => t.openPorts >= t.openPortsReq)
        .filter((t) => t.weakenTime < 200_000)
        .sort(sortFunc((t) => t.profitPerSecond))

      script = "basic-hwgw.js"
      bestTarget = basicTargets.at(-1) ?? getTarget(ns, "n00dles")
    } else {
      script = "batch-hwgw.js"
      bestTarget = targets.at(-1) ?? getTarget(ns, "n00dles")
    }

    if (bestTarget.name === currentTarget?.name && currentScript === script && currentPid > 0) {
      lastSwitch = Date.now()
      continue
    }

    if (currentPid > 0) {
      ns.kill(currentPid)
      currentPid = 0
    }

    currentScript = script
    currentPid = ns.exec(script, DAEMON_SERVER, 1, "--target", bestTarget.name)
    currentTarget = bestTarget
    lastSwitch = Date.now()
  }
}
