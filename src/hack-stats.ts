import { NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import setupPolyfill from "/lib/ns-polyfill"
import GlobalStateManager, { BasicHwgwState, BatchHwgwState, HostHackStats } from "/lib/shared/GlobalStateManager"
import { formatDate, formatMoney, formatTime } from "/lib/util"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)
  ns.disableLog("ALL")

  const stateMgr = new GlobalStateManager(globalThis)

  while (true) {
    ns.clearLog()

    printHackTable(ns, Object.values(stateMgr.getHackStats()))
    printBasicHwgwTable(ns, Object.values(stateMgr.getState().basicHwgwState))
    printBatchHwgwTable(ns, Object.values(stateMgr.getState().batchHwgwState))

    await ns.asleep(1000)
  }
}

function printBatchHwgwTable(ns: NS, state: Array<BatchHwgwState>) {
  const table: RawTableData = [["Host", "Stage", "Batches", "Time Rem"]]

  ns.print("\nBATCH HWGW STATS")

  for (const host of state) {
    table.push([
      host.target,
      host.stage,
      host.stage === "prep" ? "-" : host.batches,
      host.stage === "prep" ? "N/A" : formatTime(host.doneAt - Date.now()),
    ])
  }

  ns.print(renderTable(ns, table))
}
function printBasicHwgwTable(ns: NS, state: Array<BasicHwgwState>) {
  const table: RawTableData = [["Host", "Stage", "Time Rem"]]

  ns.print("\nBASIC HWGW STATS")

  for (const host of state) {
    table.push([host.target, host.stage, formatTime(host.doneAt - Date.now())])
  }

  ns.print(renderTable(ns, table))
}

function printHackTable(ns: NS, hackStats: Array<HostHackStats>) {
  const table: RawTableData = [["Host", "# Hacks", "Last Hack", "Sec Err H/G", "Total $", "$/s", "Started At"]]

  ns.print("\nHACK STATS")

  for (const stats of hackStats) {
    if (stats.totalHacks === 0) {
      continue
    }

    if (stats.startedAt === stats.lastResult) {
      continue
    }

    const profitPerSec = stats.totalHacks === 0 ? 0 : stats.amount / ((stats.lastResult - stats.startedAt) / 1000)
    //ns.print(stats.amount)
    //ns.print(stats.lastResult, " ", stats.startedAt)
    //ns.print(stats.lastResult - stats.startedAt)

    table.push([
      stats.host,
      ns.nFormat(stats.totalHacks, "0,0"),
      formatTime(Date.now() - stats.lastResult),
      ns.sprintf("%d/%d", stats.failedBecauseSecurity, 0),
      formatMoney(ns, stats.amount),
      formatMoney(ns, profitPerSec),
      formatDate(ns, new Date(stats.startedAt)),
    ])
  }

  ns.print(renderTable(ns, table))
}
