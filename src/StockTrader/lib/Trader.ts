import { NS } from "@ns"
import { PositionType, StockSource } from "@/StockTrader/lib/StockSource"
import { StockData, Trend } from "@/StockTrader/lib/Shared"
import { MAX_FUNDS_SPEND_PER_STOCK, MIN_STOCK_HOLD_TICKS, MIN_VAL_FOR_STOCK_ORDER } from "@/StockTrader/config"
import { SerialisedAnalyserData } from "@/StockTrader/lib/Analyser"
import { sum } from "@/lib/util"

interface StockAlgoData {
  sym: string
  lastLongBuy: number
  lastLongSell: number
  lastShortBuy: number
  lastShortSell: number
}

export class Trader {
  ns: NS
  source: StockSource

  algoData: Record<string, StockAlgoData>

  constructor(ns: NS, source: StockSource) {
    this.ns = ns
    this.source = source
    this.algoData = Object.fromEntries(
      this.source.getSymbols().map((sym) => [
        sym,
        {
          sym,
          lastLongBuy: 0,
          lastLongSell: 0,
          lastShortBuy: 0,
          lastShortSell: 0,
        },
      ]),
    )
  }

  soldRecently(sym: string, type: PositionType, ticks: number): boolean {
    return type === "long"
      ? this.algoData[sym].lastLongSell + MIN_STOCK_HOLD_TICKS > ticks
      : this.algoData[sym].lastShortSell + MIN_STOCK_HOLD_TICKS > ticks
  }

  boughtRecently(sym: string, type: PositionType, ticks: number): boolean {
    return type === "long"
      ? this.algoData[sym].lastLongBuy + MIN_STOCK_HOLD_TICKS > ticks
      : this.algoData[sym].lastShortBuy + MIN_STOCK_HOLD_TICKS > ticks
  }

  buyLong(sym: string, shares: number, ticks: number): number {
    const value = this.source.buyStock(sym, shares) * shares

    this.algoData[sym].lastLongBuy = ticks
    writeLog(this.ns, sym, "buy", "long", shares, value, -1)

    return value
  }
  sellLong(sym: string, shares: number, ticks: number): number {
    const [_longOwn, longPrice, _shortOwn, _shortPrice] = this.source.getPosition(sym)
    const purchaseCost = shares * longPrice + 100_000
    const value = this.source.sellStock(sym, shares) * shares

    this.algoData[sym].lastLongSell = ticks
    writeLog(this.ns, sym, "sell", "long", shares, value, value - purchaseCost)
    console.info("sell long", { sym, shares, longPrice, value, purchaseCost })

    return value
  }
  buyShort(sym: string, shares: number, ticks: number): number {
    const value = this.source.buyShort(sym, shares) * shares

    this.algoData[sym].lastShortBuy = ticks
    writeLog(this.ns, sym, "buy", "short", shares, value, -1)

    return value
  }
  sellShort(sym: string, shares: number, ticks: number): number {
    const [_longOwn, _longPrice, _shortOwn, shortPrice] = this.source.getPosition(sym)
    const purchaseCost = shares * shortPrice + 100_000
    const value = this.source.sellShort(sym, shares) * shares

    this.algoData[sym].lastShortSell = ticks
    writeLog(this.ns, sym, "sell", "short", shares, value, value - purchaseCost)

    return value
  }

  run(
    moneyAvailable: number,
    stockData: ReadonlyArray<StockData>,
    analysis: SerialisedAnalyserData,
    ticks: number,
  ): number {
    const portfolioWorth = sum(stockData.map((d) => d.longValue + d.shortValue))

    let currentFunds = moneyAvailable
    for (const stock of stockData) {
      const perStock = Math.min((portfolioWorth + currentFunds) * MAX_FUNDS_SPEND_PER_STOCK, currentFunds)
      currentFunds += this.tradeStock(perStock, stock, analysis, ticks)
    }
    return currentFunds
  }

  tradeStock(moneyAvailable: number, stock: StockData, analysis: SerialisedAnalyserData, ticks: number): number {
    let moneyChange = 0

    if (
      analysis.stockCycleData[stock.sym].currentTrend === Trend.Up &&
      stock.longOwned === 0 &&
      !this.soldRecently(stock.sym, "long", ticks) &&
      moneyAvailable > MIN_VAL_FOR_STOCK_ORDER
    ) {
      const toBuy = findMaxShareBuy(this.source, stock.sym, "long", moneyAvailable)
      if (toBuy > 0) {
        moneyChange -= this.buyLong(stock.sym, toBuy, ticks)
      }
    }

    if (
      analysis.stockCycleData[stock.sym].currentTrend === Trend.Down &&
      stock.shortOwned === 0 &&
      !this.soldRecently(stock.sym, "short", ticks) &&
      moneyAvailable > MIN_VAL_FOR_STOCK_ORDER
    ) {
      const toBuy = findMaxShareBuy(this.source, stock.sym, "short", moneyAvailable)
      if (toBuy > 0) {
        moneyChange -= this.buyShort(stock.sym, toBuy, ticks)
      }
    }

    if (
      analysis.stockCycleData[stock.sym].currentTrend === Trend.Up &&
      stock.shortOwned > 0 &&
      !this.boughtRecently(stock.sym, "short", ticks)
    ) {
      // Sell short
      moneyChange += this.sellShort(stock.sym, stock.shortOwned, ticks)
    }

    if (
      analysis.stockCycleData[stock.sym].currentTrend === Trend.Down &&
      stock.longOwned > 0 &&
      !this.boughtRecently(stock.sym, "long", ticks)
    ) {
      // Sell long
      moneyChange += this.sellLong(stock.sym, stock.longOwned, ticks)
    }

    return moneyChange
  }
}

function writeLog(
  ns: NS,
  sym: string,
  action: "buy" | "sell",
  type: "long" | "short",
  amt: number,
  value: number,
  profit: number,
) {
  const time = Date.now()
  ns.write("stocklog.txt", JSON.stringify({ time, sym, action, type, amt, value, profit }) + "\n", "a")
}

export function findMaxShareBuy(source: StockSource, sym: string, pos: PositionType, money: number): number {
  const pricePerStock = pos === "long" ? source.getAskPrice(sym) : source.getBidPrice(sym)
  const estimatedAmount = Math.floor((money - 100_000) / pricePerStock)

  let amt = estimatedAmount
  while (source.getPurchaseCost(sym, amt, pos) > money) {
    console.log({ sym, amt, pos })
    amt -= 10
  }

  return Math.min(amt, source.getMaxShares(sym))
}
