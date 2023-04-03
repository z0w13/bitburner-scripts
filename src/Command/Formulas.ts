import type { NS, Player, Server } from "@ns"
import { BATCH_GROW_MULTIPLIER, BATCH_INTERVAL, BATCH_WEAKEN_MULTIPLIER, PERCENTAGE_TO_HACK } from "@/config"
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from "@/constants"
import { getGrowThreads, getHackThreads, getWeakenThreads } from "@/lib/calc-threads-formulas"
import { CommandBatch, GrowCommand, HackCommand, WeakenCommand } from "@/Command/Objects"
import Script from "@/lib/Script"
import { getGrowServer, getHackServer, getWeakenServer } from "@/lib/util"

export function getWeakenCommand(ns: NS, target: Server, player: Player): WeakenCommand {
  const weakenThreads = getWeakenThreads(target)
  const weakenTime = ns.formulas.hacking.weakenTime(target, player)

  return new WeakenCommand(target.hostname, weakenThreads, weakenTime, 0, Script.fromFile(ns, SCRIPT_WEAKEN))
}

export function getHackCommand(ns: NS, target: Server, player: Player): HackCommand {
  const threads = getHackThreads(ns, target, player, PERCENTAGE_TO_HACK)
  const time = ns.formulas.hacking.hackTime(target, player)
  const sec = ns.hackAnalyzeSecurity(threads)

  return new HackCommand(target.hostname, threads, time, sec, Script.fromFile(ns, SCRIPT_HACK))
}

export function getGrowCommand(ns: NS, target: Server, player: Player): GrowCommand {
  const threads = getGrowThreads(ns, target, player)
  const time = ns.formulas.hacking.growTime(target, player)
  const sec = ns.growthAnalyzeSecurity(threads)

  return new GrowCommand(target.hostname, threads, time, sec, Script.fromFile(ns, SCRIPT_GROW))
}

export function getBatch(ns: NS, server: Server, player: Player): CommandBatch {
  const hackCommand = getHackCommand(ns, getHackServer(server), player)

  const weaken1Command = getWeakenCommand(ns, getWeakenServer(server, hackCommand.security), player)
  weaken1Command.setThreads(ns, Math.ceil(weaken1Command.threads * BATCH_WEAKEN_MULTIPLIER))

  const growCommand = getGrowCommand(ns, getGrowServer(server), player)
  growCommand.setThreads(ns, Math.ceil(growCommand.threads * BATCH_GROW_MULTIPLIER))

  const weaken2Command = getWeakenCommand(ns, getWeakenServer(server, growCommand.security), player)
  weaken2Command.setThreads(ns, Math.ceil(weaken2Command.threads * BATCH_WEAKEN_MULTIPLIER))

  const commandDelay = BATCH_INTERVAL / 4

  const longestWeakenTime = Math.max(weaken1Command.time, weaken2Command.time)
  hackCommand.delay = Math.round(longestWeakenTime - hackCommand.time)
  hackCommand.script.flags["delay"] = hackCommand.delay

  weaken1Command.delay = Math.round(longestWeakenTime - weaken1Command.time + commandDelay)
  weaken1Command.script.flags["delay"] = weaken1Command.delay

  growCommand.delay = Math.round(longestWeakenTime - growCommand.time + commandDelay * 2)
  growCommand.script.flags["delay"] = growCommand.delay

  weaken2Command.delay = Math.round(longestWeakenTime - weaken2Command.time + commandDelay * 3)
  weaken2Command.script.flags["delay"] = weaken2Command.delay

  return new CommandBatch([hackCommand, weaken1Command, growCommand, weaken2Command])
}
