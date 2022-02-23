import { NS } from "@ns"
import { BATCH_GROW_MULTIPLIER, BATCH_INTERVAL, BATCH_WEAKEN_MULTIPLIER, PERCENTAGE_TO_HACK } from "/config"
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from "/constants"
import { getGrowThreads, getHackThreads, getWeakenThreads } from "/lib/calc-threads"
import { Command, CommandBatch } from "/lib/objects"
import renderTable from "/lib/func/render-table"

export function getWeakenCommand(ns: NS, target: string, additionalSec = 0): Command {
  const threads = getWeakenThreads(ns, target, additionalSec)
  const time = ns.getWeakenTime(target)

  return getCommand(ns, target, SCRIPT_WEAKEN, threads, time, 0)
}

// WARNING: Requires server to be expected money (after grow) and expected security for accurate calculation
export function getHackCommand(ns: NS, target: string): Command {
  const threads = getHackThreads(ns, target, PERCENTAGE_TO_HACK)
  const time = ns.getHackTime(target)
  const sec = ns.hackAnalyzeSecurity(threads)

  return getCommand(ns, target, SCRIPT_HACK, threads, time, sec)
}

// WARNING: Requires server to be expected money (after hack) and expected security for accurate calculation
export function getGrowCommand(ns: NS, target: string): Command {
  const threads = getGrowThreads(ns, target)
  const time = ns.getGrowTime(target)
  const sec = ns.growthAnalyzeSecurity(threads)

  return getCommand(ns, target, SCRIPT_GROW, threads, time, sec)
}

export function getBatch(ns: NS, target: string, hackCommand: Command, growCommand: Command): CommandBatch {
  // Testing biggus multiplier to see if that fixes grow issue
  const growThreads = Math.ceil(growCommand.threads * BATCH_GROW_MULTIPLIER)
  growCommand = {
    ...growCommand,
    threads: growThreads,
    ram: growThreads * growCommand.script.ram,
    security: ns.growthAnalyzeSecurity(growThreads),
  }

  const weaken1Command = getWeakenCommand(ns, target, hackCommand.security)
  weaken1Command.threads = Math.ceil(weaken1Command.threads * BATCH_WEAKEN_MULTIPLIER)
  weaken1Command.ram = weaken1Command.threads * weaken1Command.script.ram

  const weaken2Command = getWeakenCommand(ns, target, growCommand.security)
  weaken2Command.threads = Math.ceil(weaken2Command.threads * BATCH_WEAKEN_MULTIPLIER)
  weaken2Command.ram = weaken2Command.threads * weaken2Command.script.ram

  const commandDelay = BATCH_INTERVAL / 4

  const longestWeakenTime = Math.max(weaken1Command.time, weaken2Command.time)
  hackCommand.script.args = ["--delay", Math.round(longestWeakenTime - hackCommand.time)]
  weaken1Command.script.args = ["--delay", Math.round(longestWeakenTime - weaken1Command.time + commandDelay)]
  growCommand.script.args = ["--delay", Math.round(longestWeakenTime - growCommand.time + commandDelay * 2)]
  weaken2Command.script.args = ["--delay", Math.round(longestWeakenTime - weaken2Command.time + commandDelay * 3)]

  return {
    target: target,
    threads: hackCommand.threads + weaken1Command.threads + growCommand.threads + weaken2Command.threads,
    ram: hackCommand.ram + weaken1Command.ram + growCommand.ram + weaken2Command.ram,
    time: longestWeakenTime + BATCH_INTERVAL,
    commands: [hackCommand, weaken1Command, growCommand, weaken2Command],
  }
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
