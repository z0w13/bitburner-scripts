import { NS } from "@ns"
import { STOCK_HISTORY_SIZE } from "@/StockTrader/defaults"
import { onStockTick } from "@/StockTrader/lib/Shared"
import { Tracker } from "@/StockTrader/lib/Tracker"
import { FakeTradeStockSource } from "@/StockTrader/lib/StockSource"
import { loadConfig } from "@/StockTrader/lib/Config"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  const conf = loadConfig(ns)

  const source = conf.mock ? new FakeTradeStockSource(ns.stock) : ns.stock
  const tracker = new Tracker(STOCK_HISTORY_SIZE, source.getSymbols())
  await onStockTick(ns, source, () => {
    ns.clearLog()
    tracker.update(source)
    ns.print(JSON.stringify(tracker.serialize()))
  })
}
