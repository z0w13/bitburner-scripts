import type { NS } from "@ns"
import { DAEMON_SERVER } from "@/config"
import renderTable, { RawTableData } from "@/lib/func/render-table"
import { formatMoney } from "@/lib/util"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  while (true) {
    ns.clearLog()
    const data: RawTableData = [["Target", "Income", "Exp Gain"]]

    const procs = ns.ps(DAEMON_SERVER)
    for (const proc of procs) {
      if (proc.filename !== "/libexec/batch-hwgw.js") {
        continue
      }

      data.push([
        proc.args[1],
        formatMoney(ns, ns.getScriptIncome(proc.filename, DAEMON_SERVER, ...proc.args), 0),
        ns.formatNumber(ns.getScriptExpGain(proc.filename, DAEMON_SERVER, ...proc.args), 0),
      ])
    }

    ns.print(renderTable(data))
    await ns.asleep(1000)
  }
}
