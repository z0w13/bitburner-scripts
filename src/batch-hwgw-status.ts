import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import renderTable, { RawTableData } from "/lib/func/render-table"
import setupPolyfill from "/lib/ns-polyfill"
import { formatMoney, formatNum } from "/lib/util"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)
  ns.disableLog("ALL")

  while (true) {
    ns.clearLog()
    const data: RawTableData = [["Target", "Income", "Exp Gain"]]

    const procs = ns.ps(DAEMON_SERVER)
    for (const proc of procs) {
      if (proc.filename !== "batch-hwgw.js") {
        continue
      }

      data.push([
        proc.args[1],
        formatMoney(ns, ns.getScriptIncome(proc.filename, DAEMON_SERVER, ...proc.args), "$0,0a"),
        formatNum(ns, ns.getScriptExpGain(proc.filename, DAEMON_SERVER, ...proc.args), "0,0"),
      ])
    }

    ns.print(renderTable(ns, data))
    await ns.asleep(1000)
  }
}
