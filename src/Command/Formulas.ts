import { NS, Player, Server } from "@ns"
import { PERCENTAGE_TO_HACK } from "/config"
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from "/constants"
import { getGrowThreads, getHackThreads, getWeakenThreads } from "/lib/calc-threads-formulas"
import { GrowCommand, HackCommand, WeakenCommand } from "/Command/Objects"

export function getWeakenCommand(ns: NS, target: Server, player: Player): WeakenCommand {
  const weakenThreads = getWeakenThreads(target)
  const weakenTime = ns.formulas.hacking.weakenTime(target, player)

  return new WeakenCommand(target.hostname, weakenThreads, weakenTime, 0, {
    file: SCRIPT_WEAKEN,
    ram: ns.getScriptRam(SCRIPT_WEAKEN),
  })
}

export function getHackCommand(ns: NS, target: Server, player: Player): HackCommand {
  const threads = getHackThreads(ns, target, player, PERCENTAGE_TO_HACK)
  const time = ns.formulas.hacking.hackTime(target, player)
  const sec = ns.hackAnalyzeSecurity(threads)

  return new HackCommand(target.hostname, threads, time, sec, {
    file: SCRIPT_HACK,
    ram: ns.getScriptRam(SCRIPT_HACK),
  })
}

export function getGrowCommand(ns: NS, target: Server, player: Player): GrowCommand {
  const threads = getGrowThreads(ns, target, player)
  const time = ns.formulas.hacking.growTime(target, player)
  const sec = ns.growthAnalyzeSecurity(threads)

  return new GrowCommand(target.hostname, threads, time, sec, {
    file: SCRIPT_GROW,
    ram: ns.getScriptRam(SCRIPT_GROW),
  })
}
