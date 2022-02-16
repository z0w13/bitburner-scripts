import { NS } from "@ns"
import getThreadsAvailable from "/lib/get-threads-available"
import getWeakenCommand from "/lib/get-weaken-command"
import runCommand from "/lib/run-command"
import waitForPids from "/lib/wait-for-pids"
import setupPolyfill from "/lib/ns-polyfill"
import { SCRIPT_WEAKEN } from "/constants"

interface Flags {
  target: string
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("asleep")
  ns.disableLog("scan")
  ns.disableLog("exec")
  ns.disableLog("getServerSecurityLevel")

  const flags = ns.flags([["target", "n00dles"]]) as Flags

  while (true) {
    const threads = Math.floor(getThreadsAvailable(ns, SCRIPT_WEAKEN) * 0.75)
    const cmd = getWeakenCommand(ns, ns.getServer(flags.target))
    cmd.threads = threads

    ns.printf("Weaken on %s taking %s", flags.target, ns.tFormat(cmd.time))
    await waitForPids(ns, runCommand(ns, cmd))
    ns.printf("Weaken Loop on %s gaining %s exp/second", flags.target, ns.nFormat(ns.getScriptExpGain(), "0,0"))
    await ns.asleep(1000)
  }
}
