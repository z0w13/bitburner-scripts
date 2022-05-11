import { NS } from "@ns"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class SpendHashesAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return ns.hacknet.numHashes() > 4
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    while (this.shouldPerform(ns) && this._perform(ns)) {
      continue
    }

    return true
  }

  _perform(ns: NS): boolean {
    return ns.hacknet.spendHashes("Sell for Money")
  }

  isBackground(): boolean {
    return true
  }

  shouldContinue(): boolean {
    return true
  }
}
