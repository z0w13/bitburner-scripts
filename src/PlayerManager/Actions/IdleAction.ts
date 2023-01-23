import type { NS } from "@ns"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class IdleAction extends BaseAction {
  async perform(_ns: NS): Promise<boolean> {
    return true
  }
  shouldPerform(_ns: NS): boolean {
    return false
  }
  isPerforming(ns: NS): boolean {
    return getPlayerAction(ns).type === PlayerActionType.Idle
  }
}
