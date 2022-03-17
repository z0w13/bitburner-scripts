import { NS } from "@ns"
import { isScriptRunning } from "/lib/func/is-script-running"
import waitForPids from "/lib/func/wait-for-pids"
import setupPolyfill from "/lib/ns-polyfill"
import getScriptPid from "/lib/func/get-script-pid"
import getTargets, { getTarget, Target } from "/lib/func/get-targets"
import { FlagSchema } from "/lib/objects"
import { formatTime } from "/lib/util"

interface ScriptToRun {
  name: string
  host?: string
  tail?: boolean
  args?: Array<string | number | boolean>
  argsCallback?: (flags: Flags) => Array<string>
}

const scriptsToRun: Array<ScriptToRun> = [
  { name: "autosetup.js" },
  { name: "autobuy.js" },
  { name: "player-manager.js", tail: true, argsCallback: (flags: Flags) => (flags.hack ? ["--hack"] : []) },
  { name: "server-status.js", tail: true },
  { name: "batch-hwgw-status.js", tail: true },
]

const flagSchema: FlagSchema = [["hack", false]]
interface Flags {
  hack: boolean
}

function getAvailRam(ns: NS): number {
  return ns.getServerMaxRam("home") - ns.getServerUsedRam("home")
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")
  const flags = ns.flags(flagSchema) as Flags

  await waitForPids(ns, [ns.exec("/libexec/static-data.js", "home", 1)])

  for (const script of scriptsToRun) {
    if (getAvailRam(ns) > ns.getScriptRam(script.name, "home")) {
      if (!isScriptRunning(ns, script.name, "home")) {
        const args = script.argsCallback ? script.argsCallback(flags) : script.args ?? []
        const pid = ns.exec(script.name, "home", 1, ...args)
        if (script.tail) {
          ns.tail(pid)
        }
      } else {
        if (script.tail) {
          ns.tail(getScriptPid(ns, script.name, "home"))
        }
      }
    }
  }

  let currentPid = getScriptPid(ns, "batch-hwgw.js", "home")
  let currentTarget: Target | undefined
  let autobuyPid = getScriptPid(ns, "autobuy.js", "home")
  let lastSwitch: number | undefined

  while (true) {
    await ns.asleep(1000)
    if (currentTarget && lastSwitch) {
      ns.print(
        lastSwitch + currentTarget.weakenTime + 600_000,
        " ",
        Date.now(),
        " ",
        formatTime(lastSwitch + currentTarget.weakenTime + 600_000 - Date.now()),
        " ",
        lastSwitch + currentTarget.weakenTime + 600_000 > Date.now(),
      )
    }

    const targets = getTargets(ns)
      .filter((t) => t.openPorts >= t.openPortsReq)
      .filter((t) => t.weakenTime < 200_000)

    const bestTarget = targets.at(-1) ?? getTarget(ns, "n00dles")
    ns.print(bestTarget.name)

    if (bestTarget.name === currentTarget?.name && currentPid && ns.getRunningScript(currentPid)) {
      continue
    }

    if (lastSwitch && currentTarget && lastSwitch + currentTarget.weakenTime + 600_000 > Date.now()) {
      continue
    }

    if (currentPid > 0) {
      ns.kill(currentPid)
      currentPid = 0
    }

    if (autobuyPid > 0) {
      ns.kill(autobuyPid)
      autobuyPid = 0
    }

    currentPid = ns.exec("batch-hwgw.js", "home", 1, "--target", bestTarget.name)
    currentTarget = bestTarget
    lastSwitch = Date.now()
  }
}
