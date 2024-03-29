import type { NS } from "@ns"
import { SERVER_WEAKEN_AMOUNT } from "@/constants"

export function getGrowThreads(ns: NS, hostname: string): number {
  const server = ns.getServer(hostname)

  if (!server) {
    return 0
  }

  return Math.ceil(ns.growthAnalyze(hostname, (server.moneyMax ?? 0) / (server.moneyAvailable ?? 0)))
}

export function getHackThreads(ns: NS, hostname: string, pctToHack: number): number {
  const server = ns.getServer(hostname)
  if (!server) {
    return 0
  }

  return Math.floor(ns.hackAnalyzeThreads(hostname, (server.moneyAvailable ?? 0) * pctToHack))
}

export function getWeakenThreads(ns: NS, hostname: string, additionalSec = 0): number {
  const server = ns.getServer(hostname)

  return Math.ceil(((server.hackDifficulty ?? 0) - (server.minDifficulty ?? 0) + additionalSec) / SERVER_WEAKEN_AMOUNT)
}
