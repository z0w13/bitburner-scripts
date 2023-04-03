export type PositionType = "long" | "short"

export interface StockSource {
  getSymbols(): Array<string>
  getPosition(sym: string): [number, number, number, number]
  getSaleGain(sym: string, shares: number, posType: PositionType): number
  getPurchaseCost(sym: string, shares: number, posType: PositionType): number
  getAskPrice(sym: string): number
  getBidPrice(sym: string): number
  getMaxShares(sym: string): number
  getPrice(sym: string): number
  buyStock(sym: string, shares: number): number
  buyShort(sym: string, shares: number): number
  sellStock(sym: string, shares: number): number
  sellShort(sym: string, shares: number): number
}

export class FakeTradeStockSource implements StockSource {
  source: StockSource
  longs: Record<string, { amt: number; price: number }>
  shorts: Record<string, { amt: number; price: number }>

  constructor(source: StockSource) {
    this.source = source
    this.longs = Object.fromEntries(this.source.getSymbols().map((sym) => [sym, { amt: 0, price: 0 }]))
    this.shorts = Object.fromEntries(this.source.getSymbols().map((sym) => [sym, { amt: 0, price: 0 }]))
  }
  getSymbols(): string[] {
    return this.source.getSymbols()
  }

  getPosition(sym: string): [number, number, number, number] {
    return [this.longs[sym].amt, this.longs[sym].price, this.shorts[sym].amt, this.shorts[sym].price]
  }
  getSaleGain(sym: string, shares: number, posType: PositionType): number {
    return this.source.getSaleGain(sym, shares, posType)
  }
  getPurchaseCost(sym: string, shares: number, posType: PositionType): number {
    return this.source.getPurchaseCost(sym, shares, posType)
  }
  getMaxShares(sym: string): number {
    return this.source.getMaxShares(sym)
  }
  getPrice(sym: string): number {
    return this.source.getPrice(sym)
  }
  getAskPrice(sym: string): number {
    return this.source.getAskPrice(sym)
  }
  getBidPrice(sym: string): number {
    return this.source.getBidPrice(sym)
  }

  buyStock(sym: string, shares: number): number {
    this.longs[sym].amt += shares
    this.longs[sym].price = this.getPrice(sym)

    return this.getPurchaseCost(sym, shares, "long") / shares
  }
  buyShort(sym: string, shares: number): number {
    this.shorts[sym].amt += shares
    this.shorts[sym].price = this.getPrice(sym)

    return this.getPurchaseCost(sym, shares, "short") / shares
  }
  sellStock(sym: string, shares: number): number {
    this.longs[sym].amt -= shares
    return this.getSaleGain(sym, shares, "long") / shares
  }
  sellShort(sym: string, shares: number): number {
    this.shorts[sym].amt -= shares
    return Math.abs(this.getSaleGain(sym, shares, "short")) / shares
  }
}
