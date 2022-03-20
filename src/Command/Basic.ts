import { NS } from "@ns"
import { BATCH_GROW_MULTIPLIER, BATCH_INTERVAL, BATCH_WEAKEN_MULTIPLIER, PERCENTAGE_TO_HACK } from "/config"
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from "/constants"
import { getGrowThreads, getHackThreads, getWeakenThreads } from "/lib/calc-threads"
import { Command, CommandBatch, GrowCommand, HackCommand, WeakenCommand } from "/Command/Objects"
import renderTable from "/lib/func/render-table"
import { formatGiB, formatNum, formatTime } from "/lib/util"

export function getWeakenCommand(ns: NS, target: string, additionalSec = 0): WeakenCommand {
  const threads = getWeakenThreads(ns, target, additionalSec)
  const time = ns.getWeakenTime(target)

  return new WeakenCommand(target, threads, time, 0, { file: SCRIPT_WEAKEN, ram: ns.getScriptRam(SCRIPT_WEAKEN) })
}

// WARNING: Requires server to be expected money (after grow) and expected security for accurate calculation
export function getHackCommand(ns: NS, target: string): HackCommand {
  const threads = getHackThreads(ns, target, PERCENTAGE_TO_HACK)
  const time = ns.getHackTime(target)
  const sec = ns.hackAnalyzeSecurity(threads)

  return new HackCommand(target, threads, time, sec, { file: SCRIPT_HACK, ram: ns.getScriptRam(SCRIPT_HACK) })
}

// WARNING: Requires server to be expected money (after hack) and expected security for accurate calculation
export function getGrowCommand(ns: NS, target: string): GrowCommand {
  const threads = getGrowThreads(ns, target)
  const time = ns.getGrowTime(target)
  const sec = ns.growthAnalyzeSecurity(threads)

  return new GrowCommand(target, threads, time, sec, { file: SCRIPT_GROW, ram: ns.getScriptRam(SCRIPT_GROW) })
}

export function getHwBatch(ns: NS, target: string, hackCommand: Command): CommandBatch {
  // Testing biggus multiplier to see if that fixes grow issue
  const weakenCommand = getWeakenCommand(ns, target, hackCommand.security)
  weakenCommand.setThreads(ns, Math.ceil(weakenCommand.threads * BATCH_WEAKEN_MULTIPLIER))

  const commandDelay = BATCH_INTERVAL / 3

  hackCommand.script.args = ["--delay", Math.round(weakenCommand.time - hackCommand.time)]
  weakenCommand.script.args = ["--delay", Math.round(commandDelay)]

  return new CommandBatch([hackCommand, weakenCommand])
}

export function getBatch(ns: NS, target: string, hackCommand: Command, growCommand: Command): CommandBatch {
  growCommand.setThreads(ns, Math.ceil(growCommand.threads * BATCH_GROW_MULTIPLIER))
  growCommand.security = ns.growthAnalyzeSecurity(growCommand.threads)

  const weaken1Command = getWeakenCommand(ns, target, hackCommand.security)
  weaken1Command.setThreads(ns, Math.ceil(weaken1Command.threads * BATCH_WEAKEN_MULTIPLIER))

  const weaken2Command = getWeakenCommand(ns, target, growCommand.security)
  weaken2Command.setThreads(ns, Math.ceil(weaken2Command.threads * BATCH_WEAKEN_MULTIPLIER))

  const commandDelay = BATCH_INTERVAL / 4

  const longestWeakenTime = Math.max(weaken1Command.time, weaken2Command.time)
  hackCommand.script.args = ["--delay", Math.round(longestWeakenTime - hackCommand.time)]
  weaken1Command.script.args = ["--delay", Math.round(longestWeakenTime - weaken1Command.time + commandDelay)]
  growCommand.script.args = ["--delay", Math.round(longestWeakenTime - growCommand.time + commandDelay * 2)]
  weaken2Command.script.args = ["--delay", Math.round(longestWeakenTime - weaken2Command.time + commandDelay * 3)]

  return new CommandBatch([hackCommand, weaken1Command, growCommand, weaken2Command])
}

export function printBatch(ns: NS, batch: CommandBatch) {
  ns.print(
    renderTable(
      ns,
      [
        ["Target", batch.target],
        ["Threads", batch.threads],
        ["RAM", ns.sprintf("%.2f", batch.ram)],
        ["Time", Math.round(batch.time / 1000)],
      ],
      false,
    ),
  )

  batch.commands.forEach((cmd) => {
    ns.print(
      renderTable(
        ns,
        [
          ["Script", cmd.script.file],
          ["Threads", cmd.threads],
          ["RAM", ns.sprintf("%.2f", cmd.ram)],
          ["Time", Math.round(cmd.time / 1000)],
          ["Sec", ns.sprintf("%.2f", cmd.security)],
        ],
        false,
      ),
    )
  })
}

export function printCommand(ns: NS, command: Command) {
  const renderCmd = {
    ...command,

    script: command.script.file,
    threads: formatNum(ns, command.threads, "0,00"),
    time: formatTime(command.time),
    ram: formatGiB(ns, command.ram),
    security: formatNum(ns, command.security),
  }
  ns.print(renderTable(ns, Object.entries(renderCmd), false))
}
