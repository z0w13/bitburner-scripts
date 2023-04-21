import { NS } from "@ns"
import { Wallet, MockWallet, PlayerWallet } from "@/StockTrader/lib/Wallet"
import { Trader } from "@/StockTrader/lib/Trader"
import { FakeTradeStockSource, StockSource } from "@/StockTrader/lib/StockSource"
import { MONEY_RESERVE, RECENT_STOCK_HISTORY_SIZE } from "@/StockTrader/config"
import { onStockTick, calcAllStockData } from "@/StockTrader/lib/Shared"
import { DAEMON_SERVER } from "@/config"
import parseFlags from "@/lib/parseFlags"
import { getTrackerData, getTrackerPidOrStart } from "@/StockTrader/lib/Tracker"
import { getAnalyserData, getAnalyserPidOrStart } from "@/StockTrader/lib/Analyser"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  const flags = parseFlags(ns, { mock: false })

  const trackerPid = getTrackerPidOrStart(ns)
  if (trackerPid === 0) {
    ns.tprint("Failed to start tracker, exiting.")
    ns.exit()
  }
  const analyserPid = getAnalyserPidOrStart(ns)
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
    wallet.update(
      trader.run(wallet.getFunds() - MONEY_RESERVE, stockData, analysisData, trackerData.ticks) + MONEY_RESERVE,
    )
  }
}
