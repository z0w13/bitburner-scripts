import { NS } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"
import { getBestCrime } from "/data/Crimes"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")
  ns.enableLog("commitCrime")

  while (true) {
    await ns.asleep(1000)
    const action = getPlayerAction(ns)
    if (action.type === PlayerActionType.Crime) {
      continue
    }

    const crime = getBestCrime(ns)
    if (!crime) {
      continue
    }

    ns.commitCrime(crime.name)
  }
}
