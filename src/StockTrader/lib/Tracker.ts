import { NS } from "@ns"
import RingBuffer from "@/lib/RingBuffer"
import { StockSource } from "@/StockTrader/lib/StockSource"
import { STOCK_TRACKER_SCRIPT } from "@/StockTrader/constants"
import { DAEMON_SERVER } from "@/config"

export interface SerializedTrackerData {
  ready: boolean
  ticks: number
  historyLength: number
  stocks: Record<string, SerializedStockData>
}

export interface SerializedStockData {
  sym: string
  history: ReadonlyArray<number>
  lastForecast: number
  currentForecast: number
}

class StockData {
  public sym: string
  public history: RingBuffer<number>
  public lastForecast: number
  public currentForecast: number

  constructor(sym: string, historySize: number) {
    this.sym = sym
    this.history = new RingBuffer<number>(historySize)
    this.lastForecast = 0
    this.currentForecast = 0
  }

  serialise(): SerializedStockData {
    return {
      ...this,

      history: this.history.getNonEmpty(),
    }
  }
}

export class Tracker {
  private _ticks: number
  get ticks() {
    return this._ticks
  }
  private _ready: boolean
  get ready() {
    return this._ready
  }

  private stocks: Record<string, StockData>
  private stockHistorySize: number

  constructor(stockHistorySize: number, syms: ReadonlyArray<string>) {
    this.stockHistorySize = stockHistorySize

    this.stocks = Object.fromEntries(syms.map((sym) => [sym, new StockData(sym, this.stockHistorySize)]))
    this._ticks = 0
    this._ready = false
  }

  // TODO: Rename to something nicer or rewrite a bit nicer
  isReady(source: StockSource): boolean {
    if (this._ready) {
      return true
    }

    if (source.has4SDataTIXAPI()) {
      return this._ticks > 2
    } else {
      return Object.values(this.stocks)[0].history.full
    }
  }

  update(source: StockSource): void {
    Object.values(this.stocks).forEach((stock) => {
      stock.history.push(source.getPrice(stock.sym))
      if (source.has4SDataTIXAPI()) {
        stock.lastForecast = stock.currentForecast
        stock.currentForecast = source.getForecast(stock.sym)
      }
    })

    this._ready = this.isReady(source)
    this._ticks++
  }

  get historyLength(): number {
    return Object.values(this.stocks)[0].history.filled
  }

  serialize(): SerializedTrackerData {
    return {
      ready: this.ready,
      ticks: this._ticks,
      stocks: Object.fromEntries(Object.entries(this.stocks).map(([sym, stock]) => [sym, stock.serialise()])),
      historyLength: this.historyLength,
    }
  }
}

export function getTrackerPidOrStart(ns: NS): number {
  const running = ns.getRunningScript(STOCK_TRACKER_SCRIPT)
  if (running) {
    return running.pid
  }

  const trackerPid = ns.exec(STOCK_TRACKER_SCRIPT, DAEMON_SERVER)
  if (trackerPid > 0) {
    return trackerPid
  }

  return 0
}

export function getTrackerData(ns: NS, trackerPid: number): SerializedTrackerData {
  try {
    return JSON.parse(ns.getRunningScript(trackerPid)?.logs.at(-1) ?? "") as SerializedTrackerData
  } catch (e) {
    ns.tprint(e)
    return {
      ready: false,
      ticks: 0,
      stocks: {},
      historyLength: 0,
    }
  }
}
