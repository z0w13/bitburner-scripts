import { NS } from "@ns"
import { Command } from "/lib/objects"
import { SCRIPT_GROW } from "/constants"
import ServerWrapper from "/lib/server-wrapper"

export default function getGrowthCommand(ns: NS, target: ServerWrapper): Command {
  const growthThreads = target.getGrowThreads()
  const growthTime = target.getGrowTime()
  const growthSecurity = ns.growthAnalyzeSecurity(growthThreads)

  return {
    target: target,
    threads: growthThreads,
    ram: growthThreads * ns.getScriptRam(SCRIPT_GROW),
    time: growthTime,
    security: growthSecurity,
    script: SCRIPT_GROW,
  }
}
