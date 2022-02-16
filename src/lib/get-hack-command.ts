import { NS } from "@ns"
import { Command } from "/lib/objects"
import { SCRIPT_HACK } from "/constants"
import ServerWrapper from "/lib/server-wrapper"

export default function getHackCommand(ns: NS, target: ServerWrapper): Command {
  const hackThreads = target.getHackThreads()
  const hackTime = ns.getHackTime(target.hostname)
  const hackSecurity = ns.hackAnalyzeSecurity(hackThreads)

  return {
    target: target,
    threads: hackThreads,
    ram: hackThreads * ns.getScriptRam(SCRIPT_HACK),
    time: hackTime,
    security: hackSecurity,
    script: SCRIPT_HACK,
  }
}
