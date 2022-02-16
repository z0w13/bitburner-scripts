import { NS, Server } from "@ns"
import { Command } from "/lib/objects"
import { SCRIPT_GROW } from "/constants"

export default function getGrowthCommand(ns: NS, target: Server): Command {
  const moneyAvailable = ns.getServerMoneyAvailable(target.hostname)
  const growthAmount = target.moneyMax / moneyAvailable
  const growthThreads = moneyAvailable > 0 ? Math.ceil(ns.growthAnalyze(target.hostname, growthAmount)) : 0
  const growthTime = ns.getGrowTime(target.hostname)
  const growthSecurity = ns.growthAnalyzeSecurity(growthThreads)

  return {
    target: target.hostname,
    threads: growthThreads,
    ram: growthThreads * ns.getScriptRam(SCRIPT_GROW),
    time: growthTime,
    security: growthSecurity,
    script: SCRIPT_GROW,
  }
}
