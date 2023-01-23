import type { NS } from "@ns"
import { isScriptRunning } from "/lib/func/is-script-running"
import waitForPids from "/lib/func/wait-for-pids"
import getScriptPid from "/lib/func/get-script-pid"
import { DAEMON_SERVER } from "/config"
import parseFlags, { ScriptArgs } from "/lib/parseFlags"

interface ScriptToRun {
  name: string
  host?: string
  tail?: boolean
  args?: Array<string | number | boolean>
  argsCallback?: (flags: ScriptArgs) => Array<string>
}

const scriptsToRun: Array<ScriptToRun> = [
  { name: "autosetup.js" },
  { name: "autobuy.js" },
  { name: "player-manager.js", tail: true },
  { name: "autobest-hwgw.js", tail: true },
  { name: "server-status.js", tail: true },
]

function getAvailRam(ns: NS): number {
  return ns.getServerMaxRam(DAEMON_SERVER) - ns.getServerUsedRam(DAEMON_SERVER)
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  const flags = parseFlags(ns, { hack: false })

  await waitForPids(ns, [ns.exec("/libexec/static-data.js", DAEMON_SERVER, 1)])

  for (const script of scriptsToRun) {
    if (getAvailRam(ns) > ns.getScriptRam(script.name, DAEMON_SERVER)) {
      if (!isScriptRunning(ns, script.name, DAEMON_SERVER)) {
        const args = typeof script.argsCallback === "function" ? script.argsCallback(flags) : script.args ?? []
        const pid = ns.exec(script.name, DAEMON_SERVER, 1, ...args)
        if (script.tail) {
          ns.tail(pid)
        }
      } else {
        if (script.tail) {
          ns.tail(getScriptPid(ns, script.name, DAEMON_SERVER))
        }
      }
    }
  }
}
