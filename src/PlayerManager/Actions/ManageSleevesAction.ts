import { NS, SleeveInformation } from "@ns"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class ManageSleevesAction extends BaseAction {
  getSleeves(ns: NS): Array<SleeveInformation> {
    return [...Array(ns.sleeve.getNumSleeves())].map((_val, idx) => ns.sleeve.getInformation(idx))
  }

  isPerforming(ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    return true
  }

  shouldPerform(ns: NS): boolean {
    return false
  }

  isBackground(): boolean {
    return true
  }
}
