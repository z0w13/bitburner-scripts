import { NS } from "@ns"
import renderTable, { RawTableData } from "@/lib/func/render-table"
import { formatChangeColor, TermColor } from "@/lib/term"
import { formatMoney, formatNum, sortFunc, sum } from "@/lib/util"
import { StockData, Trend } from "@/StockTrader/lib/Shared"
import { SerializedTrackerData } from "@/StockTrader/lib/Tracker"
import { SerialisedAnalyserData } from "@/StockTrader/lib/Analyser"

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

export function printOwnedStocks(ns: NS, stocks: ReadonlyArray<StockData>, analysis: SerialisedAnalyserData): void {
  const tableData: RawTableData = [["Stock", "Trnd", "Val", "Pos", "Owned (%)", "$", "%"]]

  const displayStocks = stocks.filter((v) => v.longOwned > 0 || v.shortOwned > 0)

  for (const data of displayStocks.slice().sort(sortFunc((s) => s.sym))) {
    const analysisData = analysis.stockCycleData[data.sym]

    const owned = data.longOwned > 0 ? data.longOwned : data.shortOwned
    const profit = data.longOwned > 0 ? data.longProfit : data.shortProfit
    const profitPct = data.longOwned > 0 ? data.longProfitPct : data.shortProfitPct

    tableData.push([
      formatChangeColor(data.changeAbsolute, data.sym),
      formatChangeColor(analysisData.currentTrend, Trend[analysisData.currentTrend]),
      formatMoney(ns, data.value, 0, 1_000_000),
      data.longOwned > 0 ? "Long" : "Short",
      `${formatNum(ns, owned, 0, 1_000_000)} (${ns.formatPercent(owned / data.shares, 0)})`,
      formatChangeColor(profit, formatNum(ns, profit, 2, 1_000_000)),
      formatChangeColor(profit, ns.formatPercent(profitPct, 2)),
    ])
  }

  const totalOwned = sum(stocks.map((v) => v.longOwned + v.shortOwned))
  const totalShares = sum(stocks.map((v) => v.shares))

  tableData.push([
    "",
    "",
    "",
    "",
    `${formatNum(ns, totalOwned, 0)} (${ns.formatPercent(totalOwned / totalShares, 0)})`,
    formatNum(ns, sum(stocks.map((v) => v.longProfit + v.shortProfit)), 2, 1_000_000),
    "",
  ])

  if (displayStocks.length === 0) {
    return
  }

  ns.print(renderTable(tableData, true, true))
}
export function printStockAnalysisData(
  ns: NS,
  stocks: ReadonlyArray<StockData>,
  analysis: SerialisedAnalyserData,
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
      "Vol",
      "Val",
    ],
  ]

  for (const data of stocks.slice().sort(sortFunc((s) => s.sym))) {
    const analysisData = analysis.stockCycleData[data.sym]
    const rowData = [
      formatChangeColor(data.changeAbsolute, data.sym),
      renderStockTrend(data.trend.slice(-trendHistorySize)),
      formatChangeColor(data.historicUpPct - 0.5, ns.formatPercent(data.historicUpPct)),
      formatChangeColor(data.recentUpPct - 0.5, ns.formatPercent(data.recentUpPct)),
      formatChangeColor(data.upPctDiff, ns.formatPercent(data.upPctDiff)),
      formatChangeColor(analysisData.currentTrend, Trend[analysisData.currentTrend]),
      analysisData.cycleTick > 0 ? analysisData.cycleTick : "",
      analysisData.cycleTick > 0 ? ticks - analysisData.cycleTick : "",
      data.volatility === 0 ? "???" : ns.formatPercent(data.volatility),
      formatMoney(ns, data.value, 0, 1_000_000),
    ]

    tableData.push(rowData)
  }

  ns.print(renderTable(tableData, true))
}

export function printStatus(
  ns: NS,
  tracker: SerializedTrackerData,
  funds: number,
  stockData: ReadonlyArray<StockData>,
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
          "History",
          `${tracker.historyLength}/${stockHistorySize}`,
          "Long Value $",
          formatMoney(ns, totalLongValue, 2, 1_000_000),
        ],
        [
          "Ticks",
          formatNum(ns, tracker.ticks, 0, 1_000_000),
          "Ready",
          formatChangeColor(tracker.ready, tracker.ready ? "YES" : "NO"),
          "Short Value $",
          formatMoney(ns, totalShortValue, 2, 1_000_000),
        ],
      ],
      true,
    ),
  )
}
