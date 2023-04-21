import { onStockTick } from "@/StockTrader/lib/Shared"
import { NS } from "@ns"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  while (true) {
    await onStockTick(ns, ns.stock, () => {
      ns.print(ns.formatPercent(ns.stock.getForecast("STM")))
    })
  }
  //
}
