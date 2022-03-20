import { NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import setupPolyfill from "/lib/ns-polyfill"
import { FlagSchema } from "/lib/objects"
import GlobalStateManager from "/lib/StateManager"
import { formatDate, formatMoney, formatTime } from "/lib/util"

const flagSchema: FlagSchema = [["once", false]]
interface Flags {
  once: boolean
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)
  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags
  const stateMgr = new GlobalStateManager(globalThis)

  while (true) {
    ns.clearLog()
    stateMgr.processResults()

    const table: RawTableData = [["Host", "# Hacks", "Last Hack", "Total $", "$/s", "Started At"]]

    for (const stats of Object.values(stateMgr.getHackStats())) {
      if (stats.totalHacks === 0) {
        continue
      }

      const profitPerSec = stats.totalHacks === 0 ? 0 : stats.amount / ((stats.lastResult - stats.startedAt) / 1000)

      table.push([
        stats.host,
        ns.nFormat(stats.totalHacks, "0,0"),
        formatTime(Date.now() - stats.lastResult),
        formatMoney(ns, stats.amount),
        formatMoney(ns, profitPerSec),
        formatDate(ns, new Date(stats.startedAt)),
      ])
    }

    if (flags.once) {
      ns.tprint("\n" + renderTable(ns, table))
      break
    } else {
      ns.print(renderTable(ns, table))
    }

    await ns.asleep(1000)
  }
}
