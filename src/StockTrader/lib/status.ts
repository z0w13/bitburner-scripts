import { NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import { formatChangeColor, TermColor } from "/lib/term"
import { formatMoney, formatNum, sortFunc, sum } from "/lib/util"
import { StockData, Trend } from "/StockTrader/lib/Shared"
import { StockManager } from "/StockTrader/lib/StockManager"
import { SerializedStockTrackerData } from "/StockTrader/lib/Tracker"

enum StockTrendSymbol {
  Up = TermColor.Green + "+" + TermColor.Reset,
  Down = TermColor.Red + "-" + TermColor.Reset,
  Same = TermColor.White + " " + TermColor.Reset,
}

function renderStockTrend(trends: ReadonlyArray<Trend>): string {
  return trends
    .map((trend) => {
      switch (trend) {
        case Trend.Up:
          return StockTrendSymbol.Up
        case Trend.Down:
          return StockTrendSymbol.Down
        case Trend.Same:
          return StockTrendSymbol.Same
      }
    })
    .join("")
}

export function printOwnedStocks(ns: NS, mgr: StockManager, stocks: ReadonlyArray<StockData>): void {
  const tableData: RawTableData = [["Stock", "Trnd", "Val", "Owned", "Long $", "Long %", "Short $", "Short %"]]

  const displayStocks = stocks.filter((v) => v.longOwned > 0 || v.shortOwned > 0)

  for (const data of displayStocks.slice().sort(sortFunc((s) => s.sym))) {
    const stockData = mgr.algoData[data.sym]
    tableData.push([
      formatChangeColor(data.changeAbsolute, data.sym),
      formatChangeColor(stockData.currentTrend, Trend[stockData.currentTrend]),
      formatMoney(ns, data.value, 0, 1_000_000),
      `${formatNum(ns, data.longOwned, 0, 1_000_000)}/${formatNum(ns, data.shortOwned, 0, 1_000_000)}`,
      data.longOwned > 0 ? formatChangeColor(data.longProfit, formatNum(ns, data.longProfit, 2, 1_000_000)) : "",
      data.longOwned > 0 ? formatChangeColor(data.longProfit, ns.formatPercent(data.longProfitPct, 2)) : "",
      data.shortOwned > 0 ? formatChangeColor(data.shortProfit, formatNum(ns, data.shortProfit, 2, 1_000_000)) : "",
      data.shortOwned > 0 ? formatChangeColor(data.shortProfit, ns.formatPercent(data.shortProfitPct, 2)) : "",
    ])
  }

  tableData.push([
    "",
    "",
    "",
    formatNum(ns, sum(stocks.map((v) => v.longOwned)), 0) +
      "/" +
      formatNum(ns, sum(stocks.map((v) => v.shortOwned)), 0),
    formatNum(ns, sum(stocks.map((v) => v.longProfit)), 2, 1_000_000),
    "",
    formatNum(ns, sum(stocks.map((v) => v.shortProfit)), 2, 1_000_000),
    "",
  ])

  if (displayStocks.length === 0) {
    return
  }

  ns.print(renderTable(tableData, true, true))
}
export function printStockAnalysisData(
  ns: NS,
  mgr: StockManager,
  stocks: ReadonlyArray<StockData>,
  trendHistorySize: number,
  ticks: number,
) {
  const tableData: RawTableData = [
    [
      "Stock",
      "Trend".padStart(trendHistorySize),
      "H Up %",
      "C Up %",
      "Up Diff",
      "Cycl Trnd",
      "Cycl Tick",
      "Inv T Ago",
      "Val",
    ],
  ]

  for (const data of stocks.slice().sort(sortFunc((s) => s.sym))) {
    const stockData = mgr.algoData[data.sym]
    const rowData = [
      formatChangeColor(data.changeAbsolute, data.sym),
      renderStockTrend(data.trend.slice(-trendHistorySize)),
      formatChangeColor(data.historicUpPct - 0.5, ns.formatPercent(data.historicUpPct)),
      formatChangeColor(data.recentUpPct - 0.5, ns.formatPercent(data.recentUpPct)),
      formatChangeColor(data.upPctDiff, ns.formatPercent(data.upPctDiff)),
      formatChangeColor(stockData.currentTrend, Trend[stockData.currentTrend]),
      stockData.cycleTick > 0 ? stockData.cycleTick : "",
      stockData.cycleTick > 0 ? ticks - stockData.cycleTick : "",
      formatMoney(ns, data.value, 0, 1_000_000),
    ]

    tableData.push(rowData)
  }

  ns.print(renderTable(tableData, true))
}

export function printStatus(
  ns: NS,
  tracker: SerializedStockTrackerData,
  funds: number,
  stockData: ReadonlyArray<StockData>,
  mgr: StockManager,
  stockHistorySize: number,
) {
  const totalShortValue = sum(stockData.map((stock) => stock.shortValue))
  const totalLongValue = sum(stockData.map((stock) => stock.longValue))

  ns.print(
    renderTable(
      [
        [
          "Funds",
          formatMoney(ns, funds),
          "Ready",
          formatChangeColor(tracker.ready, tracker.ready ? "YES" : "NO"),
          "History Available",
          `${tracker.historyLength}/${stockHistorySize} (${ns.formatPercent(
            tracker.historyLength / stockHistorySize,
          )})`,
          "Long Value $",
          formatMoney(ns, totalLongValue, 2, 1_000_000),
          "Short Value $",
          formatMoney(ns, totalShortValue, 2, 1_000_000),
          "Ticks",
          formatNum(ns, tracker.ticks, 0, 1_000_000),
        ],
      ],
      false,
    ),
  )
}
