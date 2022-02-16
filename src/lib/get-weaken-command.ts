import { NS, Server } from "@ns"
import { Command } from "/lib/objects"
import { SCRIPT_WEAKEN } from "/constants"

export default function getWeakenCommand(ns: NS, target: Server, planSecurity = 0): Command {
  const requiredReduction = ns.getServerSecurityLevel(target.hostname) + planSecurity - target.minDifficulty
  const weakenThreads = Math.ceil(requiredReduction / ns.weakenAnalyze(1))
  const weakenTime = ns.getWeakenTime(target.hostname)

  return {
    target: target.hostname,
    threads: weakenThreads,
    ram: weakenThreads * ns.getScriptRam(SCRIPT_WEAKEN),
    time: weakenTime,
    security: 0,
    script: SCRIPT_WEAKEN,
  }
}
