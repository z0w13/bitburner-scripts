import { NS } from "@ns"
import { StockSource } from "@/StockTrader/lib/StockSource"
import { SerializedStockData, SerializedTrackerData } from "@/StockTrader/lib/Tracker"

export enum Trend {
  Up = 1,
  Same = 0,
  Down = -1,
}

export function getTrendFromPercentage(val: number): Trend {
  if (val > 0.5) {
    return Trend.Up
  }

  if (val < 0.5) {
    return Trend.Down
  }

  return Trend.Same
}

export interface StockData {
  sym: string
  history: ReadonlyArray<number>
  trend: ReadonlyArray<Trend>
  historicUpPct: number
  recentUpPct: number
  upPctDiff: number
  volatility: number // Only available with 4S TIX API
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

export function calcAllStockData(
  source: StockSource,
  trackerData: SerializedTrackerData,
  recentStockHistorySize: number,
): ReadonlyArray<StockData> {
  return Object.values(trackerData.stocks).map((stock) => calcStockData(source, stock, recentStockHistorySize))
}

function calcStockData(source: StockSource, stock: SerializedStockData, recentStockHistorySize: number): StockData {
  const trend = getHistoricalTrend(stock.history)

  const start = stock.history.at(0) ?? 0
  const end = stock.history.at(-1) ?? 0

  const changeAbsolute = end - start
  const changePct = changeAbsolute / start

  const historicUpPct = source.has4SDataTIXAPI() ? stock.lastForecast : upPct(trend.slice(0, -recentStockHistorySize))
  const recentUpPct = source.has4SDataTIXAPI() ? stock.currentForecast : upPct(trend.slice(-recentStockHistorySize))
  const upPctDiff = recentUpPct - historicUpPct

  const volatility = source.has4SDataTIXAPI() ? source.getVolatility(stock.sym) : 0

  const [longOwned, longAvgPrice, shortOwned, shortAvgPrice] = source.getPosition(stock.sym)
  const shortCost = shortAvgPrice * shortOwned
  const shortValue = Math.abs(source.getSaleGain(stock.sym, shortOwned, "short"))
  const shortProfit = shortValue - shortCost
  const shortProfitPct = (shortValue - shortCost) / shortValue

  const longCost = longAvgPrice * longOwned
  const longValue = source.getSaleGain(stock.sym, longOwned, "long")
  const longProfit = longValue - longCost
  const longProfitPct = (longValue - longCost) / longValue

  return {
    sym: stock.sym,
    history: stock.history,
    trend,
    historicUpPct: historicUpPct,
    recentUpPct: recentUpPct,
    upPctDiff: upPctDiff,
    volatility,
    shares: source.getMaxShares(stock.sym),
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

function getHistoricalTrend(values: ReadonlyArray<number>): ReadonlyArray<Trend> {
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
