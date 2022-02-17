import { NS } from "@ns"
import { Command } from "/lib/objects"
import { SCRIPT_WEAKEN } from "/constants"
import ServerWrapper from "/lib/server-wrapper"

export default function getWeakenCommand(ns: NS, target: ServerWrapper, planSecurity = 0): Command {
  const script = {
    file: SCRIPT_WEAKEN,
    ram: ns.getScriptRam(SCRIPT_WEAKEN),
  }

  const weakenThreads = target.getWeakenThreads(planSecurity)
  const weakenTime = target.getWeakenTime()

  return {
    target,
    script,
    threads: weakenThreads,
    ram: weakenThreads * script.ram,
    time: weakenTime,
    security: 0,
  }
}
