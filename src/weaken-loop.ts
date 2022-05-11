import { NS } from "@ns"
import { SCRIPT_WEAKEN } from "/constants"
import { getWeakenCommand } from "/Command/Basic"
import getThreadsAvailable from "/lib/func/get-threads-available"
import runCommand from "/lib/func/run-command"
import setupPolyfill from "/lib/ns-polyfill"
import Script from "/lib/Script"
import waitForPids from "/lib/func/wait-for-pids"

interface Flags {
  target: string
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")

  const flags = ns.flags([["target", ""]]) as Flags

  while (true) {
    const command = getWeakenCommand(ns, flags.target)
    command.setThreads(ns, Math.floor(getThreadsAvailable(ns, Script.fromFile(ns, SCRIPT_WEAKEN)) * 0.9))

    if (command.threads > 10) {
      command.print(ns)
      await waitForPids(ns, runCommand(ns, command, { fill: true }))
      ns.printf("Exp: %.2fxp", ns.getScriptExpGain())
    }

    await ns.asleep(1000)
  }
}
