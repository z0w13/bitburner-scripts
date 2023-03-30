import type { NS } from "@ns"
import { hack, maxMoney, minSecurity } from "/lib/HwgwShared"
import parseFlags from "/lib/parseFlags"

// TODO(zowie): Find a way to optimise, probably make command calculation not use ServerWrapper
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  ns.enableLog("exec")

  const flags = parseFlags(ns, { target: "n00dles", short: false, long: false })

  while (true) {
    await maxMoney(ns, flags.target, flags.long)
    await minSecurity(ns, flags.target)
    await hack(ns, flags.target, flags.short)

    await ns.asleep(100)
  }
}
