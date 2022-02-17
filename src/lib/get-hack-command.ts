import { NS } from "@ns"
import { Command } from "/lib/objects"
import { SCRIPT_HACK } from "/constants"
import ServerWrapper from "/lib/server-wrapper"

export default function getHackCommand(ns: NS, target: ServerWrapper): Command {
  const script = {
    file: SCRIPT_HACK,
    ram: ns.getScriptRam(SCRIPT_HACK),
  }

  const hackThreads = target.getHackThreads()
  const hackTime = ns.getHackTime(target.hostname)
  const hackSecurity = ns.hackAnalyzeSecurity(hackThreads)

  return {
    target: target,
    threads: hackThreads,
    ram: hackThreads * script.ram,
    time: hackTime,
    security: hackSecurity,
    script: script,
  }
}
