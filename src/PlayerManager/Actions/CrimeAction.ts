import { NS } from "@ns"
import { getBestCrime } from "/data/Crimes"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class CrimeAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return getBestCrime(ns) !== null
  }

  isPerforming(ns: NS): boolean {
    const action = getPlayerAction(ns)
    if (action.type !== PlayerActionType.Crime) {
      return false
    }

    const bestCrime = getBestCrime(ns)

    return bestCrime !== null && bestCrime.name.toLowerCase().includes(action.crime.toLowerCase())
  }

  async perform(ns: NS): Promise<boolean> {
    const crime = getBestCrime(ns)
    if (!crime) {
      return false
    }

    ns.singularity.commitCrime(crime.name)
    return true
  }
}
