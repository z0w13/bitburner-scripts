import { NS } from "@ns"
import { getLowestRepAug } from "/data/Augments"
import { getHighestFavorFaction } from "/data/Factions"
import { CONSTANTS } from "/game-constants"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class WorkForFactionAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    const aug = getLowestRepAug(ns)
    if (!aug) {
      return false
    }

    const player = ns.getPlayer()
    if (player.money < aug.price) {
      return false
    }

    if (!aug.name.includes("NeuroFlux Governor") && ns.getOwnedAugmentations().includes(aug.name)) {
      return false
    }

    const factionRep =
      ns.getFactionRep(getHighestFavorFaction(ns, aug.factions)) + (this.isPerforming(ns) ? player.workRepGained : 0)
    return factionRep < aug.rep
  }

  isPerforming(ns: NS): boolean {
    // TODO(zowie): Figure out if we can check what faction we're working for, answer does seem to be no
    return ns.getPlayer().workType === CONSTANTS.WorkTypeFaction
  }

  perform(ns: NS): boolean {
    const aug = getLowestRepAug(ns)
    if (!aug) {
      return false
    }

    const types = ["hacking", "field", "security"]
    for (const type of types) {
      if (ns.workForFaction(getHighestFavorFaction(ns, aug.factions), type)) {
        return true
      }
    }

    return false
  }

  getType(): ActionType {
    return ActionType.FACTION_REP
  }
}
