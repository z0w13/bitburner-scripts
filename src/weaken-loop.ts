import { NS } from "@ns"
import { SCRIPT_WEAKEN } from "/constants"
import { getWeakenCommand } from "/Command/Basic"
import getThreadsAvailable from "/lib/func/get-threads-available"
import runCommand from "/lib/func/run-command"
import Script from "/lib/Script"
import waitForPids from "/lib/func/wait-for-pids"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"

interface Flags {
  target: string
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = ns.flags([["target", ""]]) as Flags & ScriptArgs

  while (true) {
    const command = getWeakenCommand(ns, flags.target)
    command.setThreads(ns, Math.floor(getThreadsAvailable(ns, Script.fromFile(ns, SCRIPT_WEAKEN)) * 0.9))

    if (command.threads > 10) {
      command.print(ns)
      await waitForPids(ns, runCommand(ns, command, { fill: true }))
      ns.printf("Exp: %.2fxp", ns.getTotalScriptExpGain())
    }

    await ns.asleep(1000)
  }
}
