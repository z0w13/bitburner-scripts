import RingBuffer from "@/lib/RingBuffer"
import { StockSource } from "@/StockTrader/lib/StockSource"

export interface SerializedStockTrackerData {
  ready: boolean
  ticks: number
  historyLength: number
  history: Record<string, ReadonlyArray<number>>
}

export class StockTracker {
  stocks: Record<string, RingBuffer<number>>
  ticks: number
  ready: boolean
  protected stockHistorySize: number
  protected recentStockHistorySize: number
  protected trendHistorySize: number

  constructor(stockHistorySize: number, recentStockHistorySize: number, trendHistorySize: number) {
    this.stockHistorySize = stockHistorySize
    this.recentStockHistorySize = recentStockHistorySize
    this.trendHistorySize = trendHistorySize

    this.stocks = {}
    this.ticks = 0
    this.ready = false
  }

  update(source: StockSource): void {
    this.ticks++

    const syms = source.getSymbols()
    syms.forEach((sym) => {
      if (!Object.prototype.hasOwnProperty.call(this.stocks, sym)) {
        this.stocks[sym] = new RingBuffer<number>(this.stockHistorySize)
      }

      this.stocks[sym].push(source.getPrice(sym))
    })

    // If we got the full history consider ourselves ready to function
    if (!this.ready && this.stocks[syms[0]].full) {
      this.ready = true
    }
  }

  get historyLength(): number {
    return Object.values(this.stocks)[0].filled
  }

  getHistory(): Record<string, ReadonlyArray<number>> {
    return Object.fromEntries(Object.entries(this.stocks).map(([sym, historyBuff]) => [sym, historyBuff.get()]))
  }

  serialize(): SerializedStockTrackerData {
    return {
      ready: this.ready,
      ticks: this.ticks,
      historyLength: this.historyLength,
      history: this.getHistory(),
    }
  }
}
