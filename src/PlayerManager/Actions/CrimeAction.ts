import { NS } from "@ns"
import { getBestCrime } from "/data/Crimes"
import { CONSTANTS } from "/game-constants"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class CrimeAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return getBestCrime(ns) !== null
  }

  isPerforming(ns: NS): boolean {
    const player = ns.getPlayer()
    const bestCrime = getBestCrime(ns)
    const currentCrime = player.crimeType.toLowerCase()

    return (
      bestCrime !== null &&
      player.workType === CONSTANTS.WorkTypeCrime &&
      currentCrime.includes(bestCrime.name.toLowerCase())
    )
  }

  perform(ns: NS): boolean {
    const crime = getBestCrime(ns)
    if (!crime) {
      return false
    }

    ns.commitCrime(crime.name)
    return true
  }

  getType(): ActionType {
    return ActionType.CRIME
  }
}
