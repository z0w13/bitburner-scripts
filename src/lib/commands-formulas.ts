import { NS, Player, Server } from "@ns"
import { PERCENTAGE_TO_HACK } from "/config"
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from "/constants"
import { getGrowThreads, getHackThreads, getWeakenThreads } from "/lib/calc-threads-formulas"
import { getCommand } from "/lib/commands-basic"
import { Command } from "/lib/objects"

export function getWeakenCommand(ns: NS, target: Server, player: Player): Command {
  const weakenThreads = getWeakenThreads(target)
  const weakenTime = ns.formulas.hacking.weakenTime(target, player)

  return getCommand(ns, target.hostname, SCRIPT_WEAKEN, weakenThreads, weakenTime, 0)
}

export function getHackCommand(ns: NS, target: Server, player: Player): Command {
  const threads = getHackThreads(ns, target, player, PERCENTAGE_TO_HACK)
  const time = ns.formulas.hacking.hackTime(target, player)
  const sec = ns.hackAnalyzeSecurity(threads)

  return getCommand(ns, target.hostname, SCRIPT_HACK, threads, time, sec)
}

export function getGrowCommand(ns: NS, target: Server, player: Player): Command {
  const threads = getGrowThreads(ns, target, player)
  const time = ns.formulas.hacking.growTime(target, player)
  const sec = ns.growthAnalyzeSecurity(threads)

  return getCommand(ns, target.hostname, SCRIPT_GROW, threads, time, sec)
}
