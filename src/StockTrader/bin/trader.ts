import { NS } from "@ns"
import { Wallet, MockWallet, PlayerWallet } from "@/StockTrader/lib/Wallet"
import { Trader } from "@/StockTrader/lib/Trader"
import { FakeTradeStockSource, StockSource } from "@/StockTrader/lib/StockSource"
import { MONEY_RESERVE, RECENT_STOCK_HISTORY_SIZE } from "@/StockTrader/config"
import { onStockTick, calcAllStockData } from "@/StockTrader/lib/Shared"
import { DAEMON_SERVER } from "@/config"
import parseFlags from "@/lib/parseFlags"
import { getTrackerData, waitForTrackerPid } from "@/StockTrader/lib/Tracker"
import { getAnalyserData, waitForAnalyserPid } from "@/StockTrader/lib/Analyser"
import { sum } from "@/lib/util"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  const flags = parseFlags(ns, { mock: false })

  const trackerPid = await waitForTrackerPid(ns, 10)
  if (trackerPid === 0) {
    ns.tprint("Failed to start tracker, exiting.")
    ns.exit()
  }
  const analyserPid = await waitForAnalyserPid(ns, 10)
  if (analyserPid === 0) {
    ns.tprint("Failed to start tracker, exiting.")
    ns.exit()
  }

  // reset the tradelog by deleting it
  ns.rm("stocklog.txt", DAEMON_SERVER)

  const source = flags.mock ? new FakeTradeStockSource(ns.stock) : ns.stock
  const wallet = flags.mock ? new MockWallet(10_000_000_000) : new PlayerWallet(ns)
  const trader = new Trader(ns, source)

  resetMarketState(source)
  await onStockTick(ns, source, () => {
    tick(ns, trackerPid, analyserPid, source, trader, wallet)
  })
}

function resetMarketState(source: StockSource): void {
  for (const sym of source.getSymbols()) {
    const [longOwn, _longPrice, shortOwn, _shortPrice] = source.getPosition(sym)
    if (longOwn > 0) {
      source.sellStock(sym, longOwn)
    }
    if (shortOwn > 0) {
      source.sellShort(sym, shortOwn)
    }
  }
}

function tick(
  ns: NS,
  trackerPid: number,
  analyserPid: number,
  source: StockSource,
  trader: Trader,
  wallet: Wallet,
): void {
  const trackerData = getTrackerData(ns, trackerPid)
  const analysisData = getAnalyserData(ns, analyserPid)
  const stockData = calcAllStockData(source, trackerData, RECENT_STOCK_HISTORY_SIZE)

  // Manage stocks
  if (trackerData.ready) {
    const stockValue = sum(stockData.map((s) => s.longValue + s.shortValue))
    const walletFunds = wallet.getFunds()
    const totalWorth = stockValue + walletFunds
    const spendable = walletFunds - Math.max(totalWorth * 0.1, MONEY_RESERVE)

    wallet.update(trader.run(spendable, stockData, analysisData, trackerData.ticks) + spendable)
  }
}
