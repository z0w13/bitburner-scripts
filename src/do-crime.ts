import type { NS } from "@ns"
import { getBestCrime } from "@/data/Crimes"
import getPlayerAction, { PlayerActionType } from "@/lib/func/get-player-action"
import parseFlags from "@/lib/parseFlags"

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags(ns, { karmawhore: false })

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
