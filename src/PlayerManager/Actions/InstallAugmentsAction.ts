import { NS } from "@ns"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class InstallAugmentsAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    // If we have more than 10 augments to install do perform
    return ns.getOwnedAugmentations(true).length - ns.getOwnedAugmentations().length > 10
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  perform(ns: NS): boolean {
    ns.installAugmentations("start.js")
    return true
  }

  getType(): ActionType {
    return ActionType.INSTALL_AUGMENT
  }

  isBackground(): boolean {
    return true
  }
}
