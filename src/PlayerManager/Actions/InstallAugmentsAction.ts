import { NS } from "@ns"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class InstallAugmentsAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    const newAugs = ns.getOwnedAugmentations(true).length - ns.getOwnedAugmentations().length
    return newAugs >= 10 || (ns.getPlayer().bitNodeN === 4 && newAugs >= 3)
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    ns.installAugmentations("start.js")
    return true
  }
}
