import { INVERSION_AGREEMENT_THRESHOLD, INVERSION_TREND_DIFF_THRESHOLD } from "@/StockTrader/config"
import { STOCK_ANALYSER_SCRIPT } from "@/StockTrader/constants"
import { StockData, Trend, getTrendFromPercentage } from "@/StockTrader/lib/Shared"
import { StockSource } from "@/StockTrader/lib/StockSource"
import { DAEMON_SERVER } from "@/config"
import getScriptPid from "@/lib/func/get-script-pid"
import { waitForScript } from "@/lib/func/waitForScript"
import { NS } from "@ns"

interface StockCycleData {
  sym: string
  cycleTick: number // Last tick we detected a cycle on -1 if none
  inversionProbStreak: number // Streak of ticks that have short term trend reversed from long term
  currentTrend: Trend
}

interface CycleData {
  cycleTick: number // Last tick we detected a cycle
  inversionStreak: number // If we detect this many inversions assume we've inverted
  lastInversion: number
}

export class Analyser {
  ns: NS
  source: StockSource

  stockCycleData: Record<string, StockCycleData>
  cycleData: CycleData

  constructor(ns: NS, source: StockSource) {
    this.ns = ns
    this.source = source
    this.cycleData = {
      cycleTick: -1,
      inversionStreak: 0,
      lastInversion: 0,
    }

    this.stockCycleData = Object.fromEntries(
      this.source.getSymbols().map((sym) => [
        sym,
        {
          sym,
          cycleTick: -1,
          inversionProbStreak: 0,
          currentTrend: Trend.Same,
        },
      ]),
    )
  }

  run(stockData: ReadonlyArray<StockData>, ticks: number): void {
    stockData.forEach((stock) => {
      this.detectCycle(stock, ticks)
    })
  }

  detectCycle(stock: StockData, ticks: number): void {
    if (this.source.has4SDataTIXAPI()) {
      this.detectCycleWith4S(stock, ticks)
    } else {
      this.detectCycleWithHistory(stock, ticks)
    }
  }

  detectCycleWith4S(stock: StockData, ticks: number): void {
    if (getTrendFromPercentage(stock.historicUpPct) === getTrendFromPercentage(stock.recentUpPct)) {
      return
    }

    // Update this stock's data
    const stockData = this.stockCycleData[stock.sym]
    stockData.cycleTick = ticks
    stockData.currentTrend = getTrendFromPercentage(stock.recentUpPct)

    // Update global data
    this.cycleData.cycleTick = ticks
    this.cycleData.lastInversion = ticks
  }

  detectCycleWithHistory(stock: StockData, ticks: number): void {
    // Reset streak if last inversion was more than X market ticks ago
    if (ticks - this.cycleData.lastInversion > 12) {
      this.cycleData.inversionStreak = 0
    }

    const recentTrend = getTrendFromPercentage(stock.recentUpPct)
    const analysisData = this.stockCycleData[stock.sym]
    const overThreshold =
      stock.upPctDiff > INVERSION_TREND_DIFF_THRESHOLD || stock.upPctDiff < -INVERSION_TREND_DIFF_THRESHOLD

    if (overThreshold && analysisData.currentTrend !== recentTrend) {
      analysisData.inversionProbStreak++
      if (analysisData.inversionProbStreak > INVERSION_AGREEMENT_THRESHOLD) {
        analysisData.inversionProbStreak = 0
        analysisData.cycleTick = ticks
        analysisData.currentTrend = recentTrend

        // TODO: This is double logging what do?
        console.info(`Detected cycle in ${stock.sym} at ${ticks} ${Trend[recentTrend]}`)

        this.cycleData.inversionStreak++
        this.cycleData.lastInversion = ticks
      }
    }

    if (this.cycleData.inversionStreak > INVERSION_AGREEMENT_THRESHOLD) {
      this.cycleData.inversionStreak = 0
      this.cycleData.cycleTick = ticks

      // TODO: Don't detect global cycles more than once every X ticks and try
      //       reduce potential cycle window over time for better accuracy somehow
      console.error(`Global cycle detected at ${ticks}`)
    }
  }

  public serialise(): SerialisedAnalyserData {
    return {
      cycleData: this.cycleData,
      stockCycleData: this.stockCycleData,
    }
  }
}

export async function waitForAnalyserPid(ns: NS, timeout = 0): Promise<number> {
  return waitForScript(ns, STOCK_ANALYSER_SCRIPT, DAEMON_SERVER, timeout)
}

export function getAnalyserPid(ns: NS): number {
  return getScriptPid(ns, STOCK_ANALYSER_SCRIPT, DAEMON_SERVER)
}

export function getAnalyserPidOrStart(ns: NS): number {
  const currPid = getAnalyserPid(ns)
  if (currPid > 0) {
    return currPid
  }

  return ns.exec(STOCK_ANALYSER_SCRIPT, DAEMON_SERVER)
}

export interface SerialisedAnalyserData {
  cycleData: CycleData
  stockCycleData: Readonly<Record<string, Readonly<StockCycleData>>>
}

export function getAnalyserData(ns: NS, pid: number): SerialisedAnalyserData {
  try {
    return JSON.parse(ns.getRunningScript(pid)?.logs.at(-1) ?? "") as SerialisedAnalyserData
  } catch (e) {
    ns.tprint(e)
    return {
      cycleData: {
        cycleTick: -1,
        inversionStreak: 0,
        lastInversion: 0,
      },
      stockCycleData: {},
    }
  }
}
