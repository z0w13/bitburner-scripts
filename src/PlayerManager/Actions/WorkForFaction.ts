import { NS } from "@ns"
import { getLowestRepAug } from "/data/Augments"
import { getHighestFavorFaction } from "/data/Factions"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class WorkForFactionAction extends BaseAction {
  hackFocus: boolean

  constructor(hackFocus = false) {
    super()

    this.hackFocus = hackFocus
  }

  shouldPerform(ns: NS): boolean {
    const aug = getLowestRepAug(ns, this.hackFocus)
    if (!aug) {
      return false
    }

    const faction = getHighestFavorFaction(ns, aug.factions)
    if (!faction) {
      return false
    }

    const player = ns.getPlayer()
    const factionRep = ns.singularity.getFactionRep(faction) + (this.isPerforming(ns) ? player.workRepGained : 0)
    return factionRep < aug.rep
  }

  isPerforming(ns: NS): boolean {
    const action = getPlayerAction(ns)
    if (action.type !== PlayerActionType.WorkForFaction) {
      return false
    }

    // TODO(zowie): Figure out if we can check what faction we're working for, answer does seem to be no
    const aug = getLowestRepAug(ns, this.hackFocus)
    if (!aug) {
      return false
    }

    return action.faction === getHighestFavorFaction(ns, aug.factions)
  }

  async perform(ns: NS): Promise<boolean> {
    const aug = getLowestRepAug(ns, this.hackFocus)
    if (!aug) {
      return false
    }

    const faction = getHighestFavorFaction(ns, aug.factions)
    if (!faction) {
      return false
    }

    const types = ["hacking", "field", "security"]
    const shouldFocus = !ns.singularity.getOwnedAugmentations().includes("Neuroreceptor Management Implant")
    for (const type of types) {
      if (ns.singularity.workForFaction(faction, type, shouldFocus)) {
        return true
      }
    }

    return false
  }
}
