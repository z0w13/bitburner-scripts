import { NS } from "@ns"
import { getAnalyserPidOrStart } from "@/StockTrader/lib/Analyser"
import { getTrackerPidOrStart } from "@/StockTrader/lib/Tracker"
import { loadConfig } from "@/StockTrader/lib/Config"

export async function main(ns: NS): Promise<void> {
  const conf = loadConfig(ns)

  // Wait for a bit to give scripts a chance to start
  await ns.asleep(1000)

  // Ensure the analyser/tracker are running
  while (true) {
    getAnalyserPidOrStart(ns, conf.mock)
    getTrackerPidOrStart(ns, conf.mock)

    await ns.asleep(5000)
  }
}
