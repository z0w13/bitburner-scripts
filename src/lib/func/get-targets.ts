import { NS } from "@ns"
import getHosts from "/lib/func/get-hosts"
import ServerWrapper from "/lib/server-wrapper"
import { sortFunc } from "/lib/util"

export interface Target {
  name: string
  growth: number
  hackSkill: number
  recommended: boolean
  openPortsReq: number
  openPorts: number

  weakenTime: number
  hackTime: number
  growTime: number

  initialWeakenThreads: number
  initialGrowThreads: number
  growThreads: number

  minDiff: number
  baseDiff: number
  currDiff: number

  currMoney: number
  maxMoney: number
  pctMoney: number

  expPerSecond: number
  profitPerSecond: number
  score: number
}

export function getTarget(ns: NS, host: string | ServerWrapper): Target {
  const server = typeof host === "string" ? new ServerWrapper(ns, host) : host
  const profitScore = server.getWeakenTime() / server.getProfitPerSecond()

  return {
    name: server.hostname,
    growth: server.serverGrowth,
    hackSkill: server.requiredHackingSkill,
    recommended: server.isRecommendedTarget().recommended,
    openPortsReq: server.numOpenPortsRequired,
    openPorts: server.getOpenPortCount(),

    weakenTime: server.getWeakenTime(),
    hackTime: server.getHackTime(),
    growTime: server.getGrowTime(),

    initialWeakenThreads: server.getInitialWeakenThreads(),
    initialGrowThreads: server.getInitialGrowThreads(),
    growThreads: server.getGrowThreads(),

    minDiff: server.minDifficulty,
    baseDiff: server.baseDifficulty,
    currDiff: server.getSecurityLevel(),

    currMoney: server.getMoneyAvailable(),
    maxMoney: server.moneyMax,
    pctMoney: server.getMoneyAvailable() / server.moneyMax,

    expPerSecond: ns.formulas.hacking.hackExp(server.getServer(), ns.getPlayer()),
    profitPerSecond: server.getProfitPerSecond(),
    score: profitScore,
  }
}

export default function getTargets(ns: NS, all = false): Array<Target> {
  return getHosts(ns)
    .map((h) => new ServerWrapper(ns, h))
    .filter((s) => s.isRecommendedTarget().recommended || (all && s.moneyMax > 0))
    .sort((a, b) => a.getProfitPerSecond() - b.getProfitPerSecond())
    .map((h) => getTarget(ns, h))
    .sort(sortFunc((t) => t.score))
}
