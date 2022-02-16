import { NS } from "@ns"
import { Command } from "/lib/objects"
import { SCRIPT_WEAKEN } from "/constants"
import ServerWrapper from "/lib/server-wrapper"

export default function getWeakenCommand(ns: NS, target: ServerWrapper, planSecurity = 0): Command {
  const weakenThreads = target.getWeakenThreads(planSecurity)
  const weakenTime = target.getWeakenTime()

  return {
    target: target,
    threads: weakenThreads,
    ram: weakenThreads * ns.getScriptRam(SCRIPT_WEAKEN),
    time: weakenTime,
    security: 0,
    script: SCRIPT_WEAKEN,
  }
}
