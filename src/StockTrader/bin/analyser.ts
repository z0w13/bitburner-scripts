import { RECENT_STOCK_HISTORY_SIZE } from "@/StockTrader/config"
import { Analyser } from "@/StockTrader/lib/Analyser"
import { calcAllStockData, onStockTick } from "@/StockTrader/lib/Shared"
import { FakeTradeStockSource } from "@/StockTrader/lib/StockSource"
import { getTrackerData, getTrackerPid } from "@/StockTrader/lib/Tracker"
import parseFlags from "@/lib/parseFlags"
import { NS } from "@ns"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  const flags = parseFlags(ns, { mock: false })
  const source = flags.mock ? new FakeTradeStockSource(ns.stock) : ns.stock
  const analyser = new Analyser(ns, source)

  await onStockTick(ns, source, async () => {
    ns.clearLog()

    const trackerPid = getTrackerPid(ns)
    if (trackerPid === 0) {
      ns.print("WARN: No tracker running...")
      return
    }

    const trackerData = getTrackerData(ns, trackerPid)
    if (trackerData.ready) {
      const stockData = calcAllStockData(source, trackerData, RECENT_STOCK_HISTORY_SIZE)
      analyser.run(stockData, trackerData.ticks)
    }

    ns.print(JSON.stringify(analyser.serialise()))
  })
}
