import { NS } from "@ns"
import { PERCENTAGE_TO_HACK } from "/config"
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from "/constants"
import { getGrowThreads, getHackThreads, getWeakenThreads } from "/lib/calc-threads"
import { Command } from "/lib/objects"
import renderTable from "/lib/render-table"

export function getWeakenCommand(ns: NS, target: string, additionalSec = 0): Command {
  const weakenThreads = getWeakenThreads(ns, target, additionalSec)
  const weakenTime = ns.getWeakenTime(target)

  return getCommand(ns, target, SCRIPT_WEAKEN, weakenThreads, weakenTime, 0)
}
export function getHackCommand(ns: NS, target: string): Command {
  const threads = getHackThreads(ns, target, PERCENTAGE_TO_HACK)
  const time = ns.getHackTime(target)
  const sec = ns.hackAnalyzeSecurity(threads)

  return getCommand(ns, target, SCRIPT_HACK, threads, time, sec)
}

export function getGrowCommand(ns: NS, target: string): Command {
  const threads = getGrowThreads(ns, target)
  const time = ns.getGrowTime(target)
  const sec = ns.growthAnalyzeSecurity(threads)

  ns.print("Grow Threads: ", threads)

  return getCommand(ns, target, SCRIPT_GROW, threads, time, sec)
}

export function getCommand(
  ns: NS,
  target: string,
  script: string,
  threads: number,
  time: number,
  security: number,
): Command {
  const ram = ns.getScriptRam(script)

  return {
    target,
    script: {
      file: script,
      ram: ram,
    },
    threads,
    ram: threads * ns.getScriptRam(script),
    time: time,
    security: security,
  }
}

export function printCommand(ns: NS, command: Command) {
  const renderCmd = {
    ...command,

    script: command.script.file,
    threads: ns.nFormat(command.threads, "0,0").replace(",", " "),
    time: ns.nFormat(Math.round(command.time / 1000), "0,0").replace(",", " ") + "s",
    ram: ns.nFormat(command.ram, "0,0.00").replace(",", " ") + "GiB",
    security: ns.nFormat(command.security, "0,0.00").replace(",", " "),
  }
  ns.print(renderTable(ns, Object.entries(renderCmd), false))
}
