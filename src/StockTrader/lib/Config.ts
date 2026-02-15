import { MAX_FUNDS_SPEND_PER_STOCK, MIN_VAL_FOR_STOCK_ORDER, MONEY_RESERVE } from "@/StockTrader/defaults"
import { DAEMON_SERVER } from "@/config"
import { NS } from "@ns"

export interface Config {
  mock: boolean
  moneyReserve: number
  minOrder: number
  maxFundsPerStock: number
}

export const DefaultConfig = {
  mock: false,
  moneyReserve: MONEY_RESERVE,
  minOrder: MIN_VAL_FOR_STOCK_ORDER,
  maxFundsPerStock: MAX_FUNDS_SPEND_PER_STOCK,
}

export function loadConfig(ns: NS): Config {
  if (!ns.fileExists("conf/trader.json.txt", DAEMON_SERVER)) {
    return { ...DefaultConfig }
  }

  const conf = JSON.parse(ns.read("conf/trader.json.txt"))

  return {
    ...DefaultConfig,
    ...conf,
  }
}

export function writeConfig(ns: NS, conf: Config): void {
  ns.write("conf/trader.json.txt", JSON.stringify(conf), "w")
}
