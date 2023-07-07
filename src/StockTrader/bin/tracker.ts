import { NS } from "@ns"
import { STOCK_HISTORY_SIZE } from "@/StockTrader/config"
import { onStockTick } from "@/StockTrader/lib/Shared"
import { Tracker } from "@/StockTrader/lib/Tracker"
import parseFlags from "@/lib/parseFlags"
import { FakeTradeStockSource } from "@/StockTrader/lib/StockSource"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  const flags = parseFlags(ns, { mock: false })

  const source = flags.mock ? new FakeTradeStockSource(ns.stock) : ns.stock
  const tracker = new Tracker(STOCK_HISTORY_SIZE, source.getSymbols())
  await onStockTick(ns, source, () => {
    ns.clearLog()
    tracker.update(source)
    ns.print(JSON.stringify(tracker.serialize()))
  })
}
