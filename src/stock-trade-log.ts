import { NS } from "@ns"
import renderTable from "/lib/func/render-table"
import { formatChangeColor, TermColor, wrapColor } from "/lib/term"
import { formatDate, formatMoney, sortFunc, sum } from "/lib/util"
interface StockLog {
  time: number
  sym: string
  action: "buy" | "sell"
  type: "long" | "short"
  amt: number
  value: number
  profit: number
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  while (true) {
    ns.clearLog()

    const stockLog = ns.read("stocklog.txt").trim()
    const trades: Array<StockLog> =
      stockLog.length === 0 ? [] : (stockLog.split("\n").map((line) => JSON.parse(line)) as Array<StockLog>)

    const totalSpent = sum(trades.filter((l) => l.action === "buy").map((l) => l.value))
    const totalEarned = sum(trades.filter((l) => l.action === "sell").map((l) => l.value))
    const totalProfit = sum(trades.filter((l) => l.action === "sell").map((l) => l.profit))

    const stockAmt: Record<string, { long: number; short: number }> = Object.fromEntries(
      ns.stock.getSymbols().map((sym) => [sym, { long: 0, short: 0 }]),
    )

    for (const trade of trades.sort(sortFunc((line) => line.time))) {
      if (trade.action === "buy") {
        stockAmt[trade.sym][trade.type] += trade.amt
      } else {
        stockAmt[trade.sym][trade.type] -= trade.amt
      }
    }

    let portfolioWorth = 0
    for (const sym of ns.stock.getSymbols()) {
      portfolioWorth += Math.abs(ns.stock.getSaleGain(sym, stockAmt[sym]["short"], "short"))
      portfolioWorth += ns.stock.getSaleGain(sym, stockAmt[sym]["long"], "long")
    }

    ns.print(
      renderTable(
        [
          ["Portfolio Worth", formatMoney(ns, portfolioWorth)],
          ["Total Spent", wrapColor(TermColor.Red, formatMoney(ns, totalSpent))],
          ["Total Earned", wrapColor(TermColor.Green, formatMoney(ns, totalEarned))],
          ["Profit", formatChangeColor(totalProfit, formatMoney(ns, totalProfit))],
        ],
        false,
      ),
    )

    ns.print("\n")

    ns.print(
      renderTable([
        ["Date", "Symbol", "Action", "Type", "Amount", "Value", "Profit"],
        ...trades
          .slice(-20)
          .sort(sortFunc((line) => line.time, true))
          .map((line) => [
            formatDate(ns, new Date(line.time), false),
            line.sym,
            formatChangeColor(line.action === "sell", line.action),
            line.type,
            line.amt,
            formatChangeColor(line.action === "sell", formatMoney(ns, Math.abs(line.value))),
            line.action === "sell" ? formatChangeColor(line.profit, formatMoney(ns, line.profit)) : "",
          ]),
      ]),
    )

    await ns.asleep(2000)
  }
}
