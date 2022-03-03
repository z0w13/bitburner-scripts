import { NS } from "@ns"
import { CONSTANTS } from "/game-constants"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class ReduceKarmaAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return ns.getPlayer().numPeopleKilled * 3 < 54000 && ns.getCrimeChance(CONSTANTS.CrimeHomicide) > 0.8
  }
  isPerforming(ns: NS): boolean {
    const player = ns.getPlayer()
    return (
      player.workType === CONSTANTS.WorkTypeCrime &&
      player.crimeType.toLowerCase().includes(CONSTANTS.CrimeHomicide.toLowerCase())
    )
  }
  perform(ns: NS): boolean {
    ns.commitCrime(CONSTANTS.CrimeHomicide)
    return true
  }
  getType(): ActionType {
    return ActionType.CRIME
  }
}
