import { NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import setupPolyfill from "/lib/ns-polyfill"
import GlobalStateManager, { GlobalState, PlayerSettings } from "/lib/GlobalStateManager"
import { toBool } from "/lib/util"

function printHelp(ns: NS) {
  ns.tprint("Commands")
  ns.tprint("  print                     Print summary of global state")
  ns.tprint("  reset                     Reset hack stats")
  ns.tprint("  set <setting> <value>     configure player manager settings")
}

function printState(ns: NS, state: GlobalState) {
  const table: RawTableData = []
  table.push(["Pending hack results", state.hackResults.length])
  if (state.hackResults.length > 0) {
    table.push(["Latest hack result", JSON.stringify(state.hackResults.at(-1))])
  }

  table.push(["Running jobs", state.jobs.length])
  table.push(["Host hack stats", Object.values(state.hackStats).length])

  if (state.drainingServers.size > 0) {
    table.push(["Draining hosts", Array.prototype.join.call(state.drainingServers.values, ", ")])
  }

  ns.tprint("\n", renderTable(ns, table, false))

  ns.tprint("Player settings:")
  Object.entries(state.playerSettings).forEach(([k, v]) => ns.tprint(`  ${k}: `, v))
}

function setPlayerSetting(
  ns: NS,
  settings: PlayerSettings,
  stateMgr: GlobalStateManager,
  args: Array<string | number | boolean>,
): void {
  if (ns.args.length < 3) {
    ns.tprint(`ERROR: Syntax statecmd.js player-set ${Object.keys(settings).join("|")} true|false`)
    return
  }

  const setting = args[1]
  const val = toBool(args[2])
  const validSettings = Object.keys(settings)

  if (!isPlayerSetting(setting, settings)) {
    ns.tprint(`ERROR: ${setting} invalid player setting, valid options: ${validSettings.join(", ")}`)
    return
  }

  stateMgr.setPlayerSetting(setting, val)
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)
  const stateMgr = new GlobalStateManager(globalThis)
  const state = stateMgr.getState()

  const command = ns.args[0]
  switch (command) {
    case "print": {
      printState(ns, state)
      break
    }
    case "player-set": {
      setPlayerSetting(ns, state.playerSettings, stateMgr, ns.args)
      break
    }
    case "reset":
      stateMgr.resetHackStats()
      ns.tprint("hack stats reset")
      break
    default:
      printHelp(ns)
      break
  }
}

function isPlayerSetting(input: string | number | boolean, settings: PlayerSettings): input is keyof PlayerSettings {
  return typeof input === "string" && Object.keys(settings).includes(input)
}
