import { NS } from "@ns"
import { RECENT_STOCK_HISTORY_SIZE, STOCK_HISTORY_SIZE, TREND_HISTORY_DISPLAY_SIZE } from "@/StockTrader/config"
import { onStockTick } from "@/StockTrader/lib/Shared"
import { StockTracker } from "@/StockTrader/lib/Tracker"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")

  const source = ns.stock
  const tracker = new StockTracker(STOCK_HISTORY_SIZE, RECENT_STOCK_HISTORY_SIZE, TREND_HISTORY_DISPLAY_SIZE)
  await onStockTick(ns, source, () => {
    ns.clearLog()
    tracker.update(source)
    ns.print(JSON.stringify(tracker.serialize()))
  })
}
