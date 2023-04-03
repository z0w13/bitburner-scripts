import { NS } from "@ns"
import { StockSource } from "@/StockTrader/lib/StockSource"

export enum Trend {
  Up = 1,
  Same = 0,
  Down = -1,
}

export interface StockData {
  sym: string
  history: ReadonlyArray<number>
  trend: ReadonlyArray<Trend>
  historicUpPct: number
  recentUpPct: number
  upPctDiff: number
  shares: number
  longOwned: number
  longCost: number
  longValue: number
  longProfit: number
  longProfitPct: number
  shortOwned: number
  shortCost: number
  shortValue: number
  shortProfit: number
  shortProfitPct: number
  changePct: number
  changeAbsolute: number
  value: number
}

function calcStockData(
  sym: string,
  history: ReadonlyArray<number>,
  source: StockSource,
  trendHistorySize: number,
  recentStockHistorySize: number,
): StockData {
  const trend = getTrend(history)

  const start = history.at(0) ?? 0
  const end = history.at(-1) ?? 0

  const changeAbsolute = end - start
  const changePct = changeAbsolute / start

  const historicUpPct = upPct(trend.slice(0, -recentStockHistorySize))
  const recentUpPct = upPct(trend.slice(-recentStockHistorySize))
  const upPctDiff = recentUpPct - historicUpPct

  const [longOwned, longAvgPrice, shortOwned, shortAvgPrice] = source.getPosition(sym)
  const shortCost = shortAvgPrice * shortOwned
  const shortValue = Math.abs(source.getSaleGain(sym, shortOwned, "short"))
  const shortProfit = shortValue - shortCost
  const shortProfitPct = (shortValue - shortCost) / shortValue

  const longCost = longAvgPrice * longOwned
  const longValue = source.getSaleGain(sym, longOwned, "long")
  const longProfit = longValue - longCost
  const longProfitPct = (longValue - longCost) / longValue

  return {
    sym,
    history,
    trend,
    historicUpPct,
    recentUpPct,
    upPctDiff,
    shares: source.getMaxShares(sym),
    longOwned,
    longCost,
    longValue,
    longProfit,
    longProfitPct,
    shortOwned,
    shortCost,
    shortValue,
    shortProfit,
    shortProfitPct,
    changeAbsolute,
    changePct,
    value: end,
  }
}

export function calcAllStockData(
  source: StockSource,
  stocks: Record<string, ReadonlyArray<number>>,
  trendHistorySize: number,
  recentStockHistorySize: number,
): ReadonlyArray<StockData> {
  return Object.entries(stocks).map(([sym, history]) =>
    calcStockData(sym, history, source, trendHistorySize, recentStockHistorySize),
  )
}

function getTrend(values: ReadonlyArray<number>): ReadonlyArray<Trend> {
  return values.map((val, idx, vals) => {
    const prevVal = vals.at(idx - 1)

    if (!prevVal) {
      return Trend.Same
    } else if (val < prevVal) {
      return Trend.Down
    } else if (val > prevVal) {
      return Trend.Up
    } else {
      return Trend.Same
    }
  })
}

function upPct(vals: ReadonlyArray<number>): number {
  return vals.filter((v) => v > 0).length / vals.length
}

export async function onStockTick(ns: NS, source: StockSource, callback: () => void) {
  let oldPrice = source.getPrice("UNV")
  while (true) {
    await ns.asleep(2_000)

    // Continue if no changes
    const newPrice = source.getPrice("UNV")
    if (newPrice === oldPrice) {
      continue
    }

    callback()

    // Reset the tick detection
    oldPrice = newPrice
  }
}
