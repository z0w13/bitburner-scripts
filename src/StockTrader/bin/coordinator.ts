import { NS } from "@ns"

import { getAnalyserPidOrStart } from "@/StockTrader/lib/Analyser"
import { getTrackerPidOrStart } from "@/StockTrader/lib/Tracker"
import parseFlags from "@/lib/parseFlags"

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags(ns, { mock: false })

  // Wait for a bit to give scripts a chance to start
  await ns.asleep(1000)

  // Ensure the analyser/tracker are running
  while (true) {
    getAnalyserPidOrStart(ns, flags.mock)
    getTrackerPidOrStart(ns, flags.mock)

    await ns.asleep(5000)
  }
}
