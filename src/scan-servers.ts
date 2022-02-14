import { NS } from '@ns'

import scanHost from "./lib-scan-host";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("scan");

  const hosts = await scanHost(ns);
  const results = []
  for (const host in hosts) {
    const server = ns.getServer(host)
    if (server.purchasedByPlayer) {
      continue;
    }

    if (!server.hasAdminRights) {
      continue;
    }

    const score = server.minDifficulty * server.moneyMax * server.serverGrowth / 1000000;
    if (score === 0) {
      continue;
    }

    results.push({ host, diff: server.minDifficulty, currDiff: server.baseDifficulty, max: server.moneyMax, grow: server.serverGrowth, score });
  }

  ns.print(ns.sprintf("%30s | %4s | %4s | %20s | %6s | %12s", "Host", "Diff", "Curr", "Max Money", "Growth", "Score"))
  for (const result of results.sort((a, b) => b.score - a.score)) {
    ns.print(ns.sprintf("%30s | %4d | %4d | %20d | %6d | %12d", result.host, result.diff, result.currDiff, result.max, result.grow, result.score))
  }
}