import { NS } from "@ns"
import { FundsSource, MockFundsSource, PlayerFundsSource } from "/StockTrader/lib/FundsSource"
import { StockManager } from "/StockTrader/lib/StockManager"
import { printOwnedStocks, printStatus, printStockAnalysisData } from "/StockTrader/lib/status"
import { FakeTradeStockSource, StockSource } from "/StockTrader/lib/StockSource"
import {
  MONEY_RESERVE,
  RECENT_STOCK_HISTORY_SIZE,
  STOCK_HISTORY_SIZE,
  TREND_HISTORY_DISPLAY_SIZE,
} from "/StockTrader/config"
import { onStockTick, calcAllStockData } from "/StockTrader/lib/Shared"
import { DAEMON_SERVER } from "/config"
import parseFlags from "/lib/parseFlags"
import { SerializedStockTrackerData } from "/StockTrader/lib/Tracker"

const STOCK_TRACKER = "/StockTrader/stock-tracker.js"

function getStockTrackerPid(ns: NS): number {
  const running = ns.getRunningScript(STOCK_TRACKER)
  if (running) {
    return running.pid
  }

  const trackerPid = ns.exec(STOCK_TRACKER, DAEMON_SERVER)
  if (trackerPid > 0) {
    return trackerPid
  }

  return 0
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  const flags = parseFlags(ns, { mock: false })

  const trackerPid = getStockTrackerPid(ns)
  if (trackerPid === 0) {
    ns.tprint("Failed to start tracker, exiting.")
    ns.exit()
  }

  ns.rm("stocklog.txt", DAEMON_SERVER)

  const source = flags.mock ? new FakeTradeStockSource(ns.stock) : ns.stock
  const fundsSource = flags.mock ? new MockFundsSource(10_000_000_000) : new PlayerFundsSource(ns)
  const mgr = new StockManager(ns, source)

  resetMarketState(source)
  await onStockTick(ns, source, () => {
    tick(ns, trackerPid, source, mgr, fundsSource)
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

function getTrackerData(ns: NS, trackerPid: number): SerializedStockTrackerData {
  try {
    return JSON.parse(ns.getRunningScript(trackerPid)?.logs.at(-1) ?? "") as SerializedStockTrackerData
  } catch (e) {
    ns.tprint(e)
    return {
      ready: false,
      ticks: 0,
      history: {},
      historyLength: 0,
    }
  }
}

function tick(ns: NS, trackerPid: number, source: StockSource, mgr: StockManager, fundsSource: FundsSource): void {
  ns.clearLog()

  try {
    const trackerData = getTrackerData(ns, trackerPid)
    const stockData = calcAllStockData(
      source,
      trackerData.history,
      TREND_HISTORY_DISPLAY_SIZE,
      RECENT_STOCK_HISTORY_SIZE,
    )

    // Manage stocks
    if (trackerData.ready) {
      fundsSource.update(
        mgr.manageStocks(fundsSource.getFunds() - MONEY_RESERVE, stockData, trackerData.ticks) + MONEY_RESERVE,
      )
    }

    // Print status
    printStatus(ns, trackerData, fundsSource.getFunds(), stockData, mgr, STOCK_HISTORY_SIZE)
    ns.print("\n")
    printOwnedStocks(ns, mgr, stockData)
    ns.print("\n")
    printStockAnalysisData(ns, mgr, stockData, TREND_HISTORY_DISPLAY_SIZE, trackerData.ticks)
  } catch (e) {
    ns.tprint(e)
  }
}
