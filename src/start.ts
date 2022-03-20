import { NS } from "@ns"
import { isScriptRunning } from "/lib/func/is-script-running"
import waitForPids from "/lib/func/wait-for-pids"
import setupPolyfill from "/lib/ns-polyfill"
import getScriptPid from "/lib/func/get-script-pid"
import { FlagSchema } from "/lib/objects"
import GlobalStateManager from "/lib/GlobalStateManager"
import { DAEMON_SERVER } from "/config"
import { GLOBAL_STATE_FILE } from "/constants"

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
  { name: "player-manager.js", tail: true },
  { name: "autobest-hwgw.js", tail: true },
  { name: "server-status.js", tail: true },
]

const flagSchema: FlagSchema = [["hack", false]]
interface Flags {
  hack: boolean
}

function getAvailRam(ns: NS): number {
  return ns.getServerMaxRam(DAEMON_SERVER) - ns.getServerUsedRam(DAEMON_SERVER)
}

async function cron(ns: NS, stateMgr: GlobalStateManager): Promise<void> {
  let ticks = 0

  while (true) {
    stateMgr.processResults()

    if (ticks % 10) {
      await ns.write(GLOBAL_STATE_FILE, JSON.stringify(stateMgr.getState()))
    }

    await ns.asleep(1_000)
    ticks++
  }
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")
  const flags = ns.flags(flagSchema) as Flags

  await waitForPids(ns, [ns.exec("/libexec/static-data.js", DAEMON_SERVER, 1)])

  // Make sure to initialise globals
  const stateMgr = new GlobalStateManager(globalThis)
  if (ns.fileExists(GLOBAL_STATE_FILE)) {
    try {
      stateMgr.restore(JSON.parse(await ns.read(GLOBAL_STATE_FILE)))
    } catch (e) {
      ns.tprint(e)
    }
  }

  for (const script of scriptsToRun) {
    if (getAvailRam(ns) > ns.getScriptRam(script.name, DAEMON_SERVER)) {
      if (!isScriptRunning(ns, script.name, DAEMON_SERVER)) {
        const args = script.argsCallback ? script.argsCallback(flags) : script.args ?? []
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

  await cron(ns, stateMgr)
}
