import { NS } from "@ns"
import { getBestCrime } from "/data/Crimes"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"

interface Flags {
  karmawhore: boolean
}

export async function main(ns: NS): Promise<void> {
  const flags = ns.flags([["karmawhore", false]]) as Flags & ScriptArgs

  ns.disableLog("ALL")
  ns.enableLog("commitCrime")

  while (true) {
    await ns.asleep(1000)
    const action = getPlayerAction(ns)
    if (action.type === PlayerActionType.Crime) {
      continue
    }

    if (flags.karmawhore) {
      ns.singularity.commitCrime("Homicide")
      continue
    }

    const crime = getBestCrime(ns)
    if (!crime) {
      continue
    }

    ns.singularity.commitCrime(crime.name)
  }
}
