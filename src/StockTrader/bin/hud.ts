import { RECENT_STOCK_HISTORY_SIZE, STOCK_HISTORY_SIZE, TREND_HISTORY_DISPLAY_SIZE } from "@/StockTrader/defaults"
import { getAnalyserData, getAnalyserPid } from "@/StockTrader/lib/Analyser"
import { getTrackerData, getTrackerPid } from "@/StockTrader/lib/Tracker"
import { calcAllStockData, onStockTick } from "@/StockTrader/lib/Shared"
import { FakeTradeStockSource } from "@/StockTrader/lib/StockSource"
import { printOwnedStocks, printStatus, printStockAnalysisData } from "@/StockTrader/lib/status"
import { NS } from "@ns"
import { loadConfig } from "@/StockTrader/lib/Config"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")

  const conf = loadConfig(ns)
  const source = conf.mock ? new FakeTradeStockSource(ns.stock) : ns.stock

  await onStockTick(ns, source, () => {
    ns.clearLog()

    const trackerPid = getTrackerPid(ns)
    if (trackerPid === 0) {
      ns.print("WARN: No tracker running...")
      return
    }

    const analyserPid = getAnalyserPid(ns)
    if (analyserPid === 0) {
      ns.print("WARN: No analyser running...")
      return
    }

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
