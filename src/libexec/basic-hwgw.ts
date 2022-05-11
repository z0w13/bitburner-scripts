import { NS } from "@ns"
import { getHackCommand, getGrowCommand, getWeakenCommand } from "/Command/Basic"
import { FlagSchema } from "/lib/objects"
import { MONEY_WIGGLE, SECURITY_WIGGLE } from "/config"
import waitForPids from "/lib/func/wait-for-pids"
import runCommand from "/lib/func/run-command"
import { getGlobalState } from "/lib/shared/GlobalStateManager"
import { hack, maxMoney, minSecurity } from "/lib/HwgwShared"

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
    await maxMoney(ns, flags.target)
    await minSecurity(ns, flags.target)
    await hack(ns, flags.target)

    await ns.asleep(100)
  }
}
