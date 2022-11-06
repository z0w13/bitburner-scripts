import { NS } from "@ns"
import { getSleeves, SleeveData } from "/lib/SleeveUtil"
import { sortFunc } from "/lib/util"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class BuySleeveAugmentsAction extends BaseAction {
  isPerforming(_ns: NS): boolean {
    return false
  }

  async manageSleeve(ns: NS, sleeve: SleeveData): Promise<boolean> {
    const augs = ns.sleeve.getSleevePurchasableAugs(sleeve.index).sort(sortFunc((a) => a.cost))
    if (augs.length === 0) {
      return true
    }

    const cheapestAug = augs[0]

    if (ns.getPlayer().money > cheapestAug.cost) {
      const success = ns.sleeve.purchaseSleeveAug(sleeve.index, cheapestAug.name)

      if (success) {
        ns.toast(`Sleeves: bought ${cheapestAug.name} for sleeve ${sleeve.index}`)
      }

      return success
    }

    return true
  }

  async perform(ns: NS): Promise<boolean> {
    const results = await Promise.all(getSleeves(ns).map(async (sleeve) => await this.manageSleeve(ns, sleeve)))
    return results.findIndex((v) => !v) === -1
  }

  shouldPerform(_ns: NS): boolean {
    return true
  }

  isBackground(): boolean {
    return true
  }
}
