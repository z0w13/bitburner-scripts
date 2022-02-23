import { NS } from "@ns"
import { getHackCommand, getGrowCommand, getWeakenCommand, printCommand } from "/lib/commands-basic"
import { FlagSchema } from "/lib/objects"
import { MONEY_WIGGLE, SECURITY_WIGGLE } from "/config"
import waitForPids from "/lib/func/wait-for-pids"
import runCommand from "/lib/func/run-command"

const flagSchema: FlagSchema = [["target", "n00dles"]]

interface Flags {
  target: string
}

// TODO(zowie): Find a way to optimise, probably make command calculation not use ServerWrapper
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  ns.enableLog("exec")

  const flags = ns.flags(flagSchema) as Flags

  while (true) {
    while (ns.getServerMoneyAvailable(flags.target) < ns.getServerMaxMoney(flags.target) * (1 - MONEY_WIGGLE)) {
      while (
        ns.getServerSecurityLevel(flags.target) >
        ns.getServerMinSecurityLevel(flags.target) * (1 + SECURITY_WIGGLE)
      ) {
        const command = getWeakenCommand(ns, flags.target)
        printCommand(ns, command)
        await waitForPids(ns, runCommand(ns, command, { fill: true }))
      }

      const command = getGrowCommand(ns, flags.target)
      printCommand(ns, command)
      await waitForPids(ns, runCommand(ns, command, { fill: true }))
    }

    while (
      ns.getServerSecurityLevel(flags.target) >
      ns.getServerMinSecurityLevel(flags.target) * (1 + SECURITY_WIGGLE)
    ) {
      const command = getWeakenCommand(ns, flags.target)
      printCommand(ns, command)
      await waitForPids(ns, runCommand(ns, command, { fill: true }))
    }

    const command = getHackCommand(ns, flags.target)
    printCommand(ns, command)
    await waitForPids(ns, runCommand(ns, command, { fill: true }))

    await ns.asleep(1)
  }
}
