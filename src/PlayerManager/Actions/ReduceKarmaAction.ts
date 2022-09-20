import { NS } from "@ns"
import { Crimes } from "/data/Crimes"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class ReduceKarmaAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return (
      ns.getPlayer().numPeopleKilled * 3 < 54000 &&
      ns.singularity.getCrimeChance(Crimes.Homicide) > 0.8 &&
      !ns.gang.inGang()
    )
  }

  isPerforming(ns: NS): boolean {
    const action = getPlayerAction(ns)
    if (action.type !== PlayerActionType.Crime) {
      return false
    }

    return action.crime.toLowerCase().includes(Crimes.Homicide.toLowerCase())
  }

  async perform(ns: NS): Promise<boolean> {
    const player = ns.getPlayer()
    if (ns.gang.inGang()) {
      return false
    }

    if (player.numPeopleKilled % 1000 === 0) {
      ns.print(`Killed ${player.numPeopleKilled} out of 18000 so far, ${18000 - player.numPeopleKilled} to go`)
    }

    ns.singularity.commitCrime(Crimes.Homicide)
    return true
  }
}
