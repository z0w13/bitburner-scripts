import { RECENT_STOCK_HISTORY_SIZE, STOCK_HISTORY_SIZE, TREND_HISTORY_DISPLAY_SIZE } from "@/StockTrader/config"
import { getAnalyserData, waitForAnalyserPid } from "@/StockTrader/lib/Analyser"
import { getTrackerData, waitForTrackerPid } from "@/StockTrader/lib/Tracker"
import { calcAllStockData, onStockTick } from "@/StockTrader/lib/Shared"
import { FakeTradeStockSource } from "@/StockTrader/lib/StockSource"
import { printOwnedStocks, printStatus, printStockAnalysisData } from "@/StockTrader/lib/status"
import parseFlags from "@/lib/parseFlags"
import { NS } from "@ns"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  const flags = parseFlags(ns, { mock: false })

  const trackerPid = await waitForTrackerPid(ns, 10)
  if (trackerPid === 0) {
    ns.tprint("Failed to start tracker, exiting.")
    ns.exit()
  }

  const analyserPid = await waitForAnalyserPid(ns, 10)
  if (analyserPid === 0) {
    ns.tprint("Failed to start tracker, exiting.")
    ns.exit()
  }

  const source = flags.mock ? new FakeTradeStockSource(ns.stock) : ns.stock

  await onStockTick(ns, source, () => {
    ns.clearLog()

    const trackerData = getTrackerData(ns, trackerPid)
    const analysisData = getAnalyserData(ns, analyserPid)
    const stockData = calcAllStockData(source, trackerData, RECENT_STOCK_HISTORY_SIZE)

    // Print status
    printStatus(ns, trackerData, ns.getPlayer().money, stockData, STOCK_HISTORY_SIZE)
    ns.print("\n")
    printOwnedStocks(ns, stockData, analysisData)
    ns.print("\n")
    printStockAnalysisData(ns, stockData, analysisData, TREND_HISTORY_DISPLAY_SIZE, trackerData.ticks)
  })
}
