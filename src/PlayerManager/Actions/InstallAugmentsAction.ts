import { NS } from "@ns"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class InstallAugmentsAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    const newAugs = ns.singularity.getOwnedAugmentations(true).length - ns.singularity.getOwnedAugmentations().length
    return newAugs >= 10 || (ns.getPlayer().bitNodeN === 4 && newAugs >= 3)
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    ns.singularity.installAugmentations("start.js")
    return true
  }
}
