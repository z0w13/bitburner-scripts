import { NS } from "@ns"
import { ActionType } from "/PlayerManager/Actions/ActionType"

export default abstract class BaseAction {
  abstract shouldPerform(ns: NS): boolean
  abstract isPerforming(ns: NS): boolean
  abstract perform(ns: NS): boolean
  abstract getType(): ActionType

  isBackground(): boolean {
    return false
  }
}
