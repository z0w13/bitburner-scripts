import { NS } from "@ns"
import * as formulas from "/lib/calc-threads-formulas"
import * as basic from "/lib/calc-threads"
import renderTable, { RawTableData } from "/lib/func/render-table"

export async function main(ns: NS): Promise<void> {
  const testHosts = ["n00dles", "iron-gym", "fulcrumtech"]
  const table: RawTableData = [["Func", "Server", "Regular Calc", "Formula Calc", "Diff"]]

  for (const host of testHosts) {
    const server = ns.getServer(host)
    const player = ns.getPlayer()
    const formula = formulas.getGrowThreads(ns, server, player)
    const builtin = basic.getGrowThreads(ns, host)

    table.push(["getGrowThreads", host, builtin, formula, builtin - formula])
  }

  for (const host of testHosts) {
    const server = ns.getServer(host)
    const formula = formulas.getWeakenThreads(server)
    const builtin = basic.getWeakenThreads(ns, host)

    table.push(["getWeakenThreads", host, builtin, formula, builtin - formula])
  }

  ns.print(renderTable(ns, table))

  for (const host of testHosts) {
    const server = ns.getServer(host)
    const player = ns.getPlayer()
    const formula = formulas.getHackThreads(ns, server, player, 0.75)
    const builtin = basic.getHackThreads(ns, host, 0.75)

    table.push(["getHackThreads", host, builtin, formula, builtin - formula])
  }

  ns.print(renderTable(ns, table))
}
