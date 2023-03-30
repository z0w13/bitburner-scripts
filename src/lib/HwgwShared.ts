import type { NS } from "@ns"
import { getGrowCommand, getHackCommand, getWeakenCommand } from "/Command/Formulas"
import { MONEY_WIGGLE, SECURITY_WIGGLE } from "/config"
import runCommand from "/lib/func/run-command"
import waitForPids from "/lib/func/wait-for-pids"
import { formatTime, renderProgress } from "/lib/util"

export function isMaxMoney(ns: NS, target: string): boolean {
  return ns.getServerMoneyAvailable(target) >= ns.getServerMaxMoney(target) * (1 - MONEY_WIGGLE)
}

export function isMinSecurity(ns: NS, target: string): boolean {
  return ns.getServerSecurityLevel(target) <= ns.getServerMinSecurityLevel(target) * (1 + SECURITY_WIGGLE)
}

export async function maxMoney(ns: NS, target: string, stock = false): Promise<void> {
  while (!isMaxMoney(ns, target)) {
    await minSecurity(ns, target)

    const command = getGrowCommand(ns, ns.getServer(target), ns.getPlayer())
    const startTime = Date.now()
    const endTime = startTime + command.getTotalTime()

    await waitForPids(ns, runCommand(ns, command, { fill: true, args: ["--stock", stock] }), 1000, (_) => {
      ns.clearLog()
      printCommandProgress(ns, "grow", startTime, endTime)
    })
  }
}

export async function minSecurity(ns: NS, target: string): Promise<void> {
  while (!isMinSecurity(ns, target)) {
    const command = getWeakenCommand(ns, ns.getServer(target), ns.getPlayer())
    const startTime = Date.now()
    const endTime = startTime + command.getTotalTime()

    await waitForPids(ns, runCommand(ns, command, { fill: true }), 1000, (_) => {
      ns.clearLog()
      printCommandProgress(ns, "weaken", startTime, endTime)
    })
  }
}

function printCommandProgress(ns: NS, command: string, startTime: number, endTime: number): void {
  const remaining = Math.max(endTime - Date.now(), 0)

  ns.printf(
    "%s | %9s [%s]",
    command,
    formatTime(remaining),
    renderProgress({ min: startTime, max: endTime, value: Date.now(), width: 20 }),
  )
}

export async function hack(ns: NS, target: string, stock = false): Promise<void> {
  const command = getHackCommand(ns, ns.getServer(target), ns.getPlayer())
  const startTime = Date.now()
  const endTime = startTime + command.getTotalTime()

  await waitForPids(ns, runCommand(ns, command, { fill: true, args: ["--stock", stock] }), 1000, (_) => {
    ns.clearLog()
    printCommandProgress(ns, "hack", startTime, endTime)
  })
}
