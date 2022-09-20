import { NS } from "@ns"
import { FlagSchema } from "/lib/objects"
import { hack, maxMoney, minSecurity } from "/lib/HwgwShared"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"

const flagSchema: FlagSchema = [["target", "n00dles"]]

interface Flags {
  target: string
}

// TODO(zowie): Find a way to optimise, probably make command calculation not use ServerWrapper
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  ns.enableLog("exec")

  const flags = ns.flags(flagSchema) as Flags & ScriptArgs

  while (true) {
    await maxMoney(ns, flags.target)
    await minSecurity(ns, flags.target)
    await hack(ns, flags.target)

    await ns.asleep(100)
  }
}
