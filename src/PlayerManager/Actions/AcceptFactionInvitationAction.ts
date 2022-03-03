import { NS } from "@ns"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class AcceptFactionInvitationsAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return ns.checkFactionInvitations().length > 0
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  perform(ns: NS): boolean {
    return ns.checkFactionInvitations().every((f) => ns.joinFaction(f))
  }

  getType(): ActionType {
    return ActionType.FACTION_ACCEPT_INVITATIONS
  }

  isBackground(): boolean {
    return true
  }
}
