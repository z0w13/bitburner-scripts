import {
  STOCK_ANALYSER_SCRIPT,
  STOCK_COORDINATOR_SCRIPT,
  STOCK_HUD_SCRIPT,
  STOCK_LOG_SCRIPT,
  STOCK_TRACKER_SCRIPT,
  STOCK_TRADER_SCRIPT,
} from "@/StockTrader/constants"
import { DAEMON_SERVER } from "@/config"
import getScriptPid from "@/lib/func/get-script-pid"
import tailExec from "@/lib/func/tail-exec"
import parseFlags from "@/lib/parseFlags"
import { NS } from "@ns"

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags(ns, { mock: false })
  const args = flags.mock ? ["--mock"] : []

  const scripts = [
    STOCK_TRACKER_SCRIPT,
    STOCK_ANALYSER_SCRIPT,
    STOCK_TRACKER_SCRIPT,
    STOCK_TRADER_SCRIPT,
    STOCK_LOG_SCRIPT,
    STOCK_COORDINATOR_SCRIPT,
  ]

  scripts.forEach((script) => {
    if (!getScriptPid(ns, script, DAEMON_SERVER) && !ns.exec(script, DAEMON_SERVER, 1, ...args)) {
      ns.tprint(`ERROR: Couldn't start ${script}`)
    }
  })

  if (
    !getScriptPid(ns, STOCK_HUD_SCRIPT, DAEMON_SERVER) &&
    !tailExec(ns, STOCK_HUD_SCRIPT, DAEMON_SERVER, 1, ...args)
  ) {
    ns.tprint(`ERROR: Couldn't start ${STOCK_HUD_SCRIPT}`)
  }
}
