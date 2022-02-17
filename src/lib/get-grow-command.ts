import { NS } from "@ns"
import { Command } from "/lib/objects"
import { SCRIPT_GROW } from "/constants"
import ServerWrapper from "/lib/server-wrapper"

export default function getGrowthCommand(ns: NS, target: ServerWrapper): Command {
  const script = {
    file: SCRIPT_GROW,
    ram: ns.getScriptRam(SCRIPT_GROW),
  }

  const growthThreads = target.getGrowThreads()
  const growthTime = target.getGrowTime()
  const growthSecurity = ns.growthAnalyzeSecurity(growthThreads)

  return {
    target,
    script,
    threads: growthThreads,
    ram: growthThreads * script.ram,
    time: growthTime,
    security: growthSecurity,
  }
}
