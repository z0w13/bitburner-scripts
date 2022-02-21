import { NS } from "@ns"
import { getHackCommand, getGrowCommand, getWeakenCommand } from "/lib/commands-basic"
import { FlagSchema } from "/lib/objects"
import { MONEY_WIGGLE, SECURITY_WIGGLE } from "/config"
import waitForPids from "/lib/wait-for-pids"
import runCommand from "/lib/run-command"

const flagSchema: FlagSchema = [["target", "n00dles"]]

interface Flags {
  target: string
}

// TODO(zowie): Find a way to optimise, probably make command calculation not use ServerWrapper
export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  ns.disableLog("scan")

  const flags = ns.flags(flagSchema) as Flags

  while (true) {
    while (ns.getServerMoneyAvailable(flags.target) < ns.getServerMaxMoney(flags.target) * (1 - MONEY_WIGGLE)) {
      while (
        ns.getServerSecurityLevel(flags.target) >
        ns.getServerMinSecurityLevel(flags.target) * (1 + SECURITY_WIGGLE)
      ) {
        await waitForPids(ns, runCommand(ns, getWeakenCommand(ns, flags.target), { fill: true }))
      }
      await waitForPids(ns, runCommand(ns, getGrowCommand(ns, flags.target), { fill: true }))
    }

    while (
      ns.getServerSecurityLevel(flags.target) >
      ns.getServerMinSecurityLevel(flags.target) * (1 + SECURITY_WIGGLE)
    ) {
      await waitForPids(ns, runCommand(ns, getWeakenCommand(ns, flags.target), { fill: true }))
    }
    await waitForPids(ns, runCommand(ns, getHackCommand(ns, flags.target), { fill: true }))

    await ns.asleep(1)
  }
}
