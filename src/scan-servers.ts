import { NS } from "@ns"

import scanHost from "/lib/scan-host"
import renderTable from "/lib/render-table"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("scan")

  const hosts = await scanHost(ns)
  const results = []
  for (const host in hosts) {
    const server = ns.getServer(host)
    if (server.purchasedByPlayer) {
      continue
    }

    if (!server.hasAdminRights) {
      continue
    }

    const score = (server.minDifficulty * server.moneyMax * server.serverGrowth) / 1000000
    if (score === 0) {
      continue
    }

    results.push({
      host,
      diff: server.minDifficulty,
      currDiff: server.hackDifficulty,
      max: server.moneyMax,
      grow: server.serverGrowth,
      score,
    })
  }

  const table = [["Host", "Diff", "Curr Diff", "Max Money", "Growth", "Score"]]

  for (const result of results.sort((a, b) => b.score - a.score)) {
    table.push([
      result.host,
      ns.nFormat(result.diff, "0,0"),
      ns.nFormat(result.currDiff, "0,0"),
      ns.nFormat(result.max, "$0,0"),
      ns.nFormat(result.grow, "0,0"),
      ns.nFormat(result.score, "0,0"),
    ])
  }

  ns.print(renderTable(ns, table))
}
