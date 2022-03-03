import { NS } from "@ns"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class IdleAction extends BaseAction {
  perform(_ns: NS): boolean {
    return true
  }
  shouldPerform(_ns: NS): boolean {
    return false
  }
  isPerforming(ns: NS): boolean {
    return ns.getPlayer().workType === ""
  }
  getType(): ActionType {
    return ActionType.IDLE
  }
}
