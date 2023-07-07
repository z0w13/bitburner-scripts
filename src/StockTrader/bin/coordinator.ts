import { NS } from "@ns"

import { getAnalyserPidOrStart } from "@/StockTrader/lib/Analyser"
import { getTrackerPidOrStart } from "@/StockTrader/lib/Tracker"

export async function main(ns: NS): Promise<void> {
  // Wait for a bit to give scripts a chance to start
  await ns.asleep(1000)

  // Ensure the analyser/tracker are running
  while (true) {
    getAnalyserPidOrStart(ns)
    getTrackerPidOrStart(ns)

    await ns.asleep(5000)
  }
}
