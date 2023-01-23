import type { NS } from "@ns"
import { PERCENTAGE_TO_HACK } from "/config"
import { JobType } from "/JobScheduler/JobObjects"
import { getBatchJob } from "/lib/func/get-batch-job"
import getHosts from "/lib/func/get-hosts"
import HostManager from "/lib/HostManager"
import ServerWrapper from "/lib/ServerWrapper"
import { sortFunc } from "/lib/util"
import VirtualNetworkState from "/lib/VirtualNetworkState"

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
  hackThreads: number

  batches: number

  batchDuration: number
  batchProfitPerSecond: number

  minDiff: number
  baseDiff: number
  currDiff: number

  currMoney: number
  maxMoney: number
  pctMoney: number

  expPerSecond: number
  profitPerSecond: number
  score: number

  optimalType: JobType.HackWeakenGrowWeaken | JobType.Batch
  optimalProfit: number
}

export function getTarget(ns: NS, host: string | ServerWrapper): Target {
  const server = typeof host === "string" ? new ServerWrapper(ns, host) : host
  const profitScore = server.getWeakenTime() / server.getProfitPerSecond()
  const networkState = VirtualNetworkState.fromServersWithoutCommands(ns, new HostManager(ns).getUsableServers())
  const batchJob = getBatchJob(ns, server.getServer(), ns.getPlayer(), networkState.copy())

  const batchProfitPerSecond =
    batchJob.numBatches > 0
      ? (server.moneyMax * PERCENTAGE_TO_HACK * batchJob.numBatches) / (batchJob.getDuration() / 1000)
      : 0

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
    hackThreads: server.getHackThreads(),

    batches: batchJob.numBatches,
    batchDuration: batchJob.numBatches > 0 ? batchJob.getDuration() : 0,
    batchProfitPerSecond: batchProfitPerSecond,

    minDiff: server.minDifficulty,
    baseDiff: server.baseDifficulty,
    currDiff: server.getSecurityLevel(),

    currMoney: server.getMoneyAvailable(),
    maxMoney: server.moneyMax,
    pctMoney: server.getMoneyAvailable() / server.moneyMax,

    expPerSecond: ns.formulas.hacking.hackExp(server.getServer(), ns.getPlayer()),
    profitPerSecond: server.getProfitPerSecond(),
    score: profitScore,

    optimalType: server.getProfitPerSecond() > batchProfitPerSecond ? JobType.HackWeakenGrowWeaken : JobType.Batch,
    optimalProfit:
      server.getProfitPerSecond() > batchProfitPerSecond ? server.getProfitPerSecond() : batchProfitPerSecond,
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
