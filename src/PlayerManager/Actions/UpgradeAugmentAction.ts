import { NS } from "@ns"
import { getLowestRepAug } from "/data/Augments"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class UpgradeAugmentAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    const player = ns.getPlayer()
    const aug = getLowestRepAug(ns)
    if (!aug) {
      return false
    }

    const faction = aug.factions.find((f) => ns.getFactionRep(f) > aug.rep)
    if (!faction) {
      return false
    }

    if (aug.rep > ns.getFactionRep(faction)) {
      return false
    }

    if (aug.price > player.money) {
      return false
    }

    return true
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  perform(ns: NS): boolean {
    const aug = getLowestRepAug(ns)
    if (!aug) {
      return false
    }

    const faction = aug.factions.find((f) => ns.getFactionRep(f) > aug.rep)
    if (!faction) {
      return false
    }

    return ns.purchaseAugmentation(faction, aug.name)
  }

  getType(): ActionType {
    return ActionType.BUY_AUGMENT
  }

  isBackground(): boolean {
    return true
  }
}
