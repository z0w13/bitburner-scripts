import { NS } from "@ns"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class AcceptFactionInvitationsAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return ns.singularity.checkFactionInvitations().length > 0
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    return ns.singularity.checkFactionInvitations().every((f) => ns.singularity.joinFaction(f))
  }

  isBackground(): boolean {
    return true
  }

  shouldContinue(): boolean {
    return true
  }
}
