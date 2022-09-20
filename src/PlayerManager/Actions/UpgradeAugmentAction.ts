import { NS } from "@ns"
import { getLowestMetRepAug } from "/data/Augments"
import BaseAction from "/PlayerManager/Actions/BaseAction"

/**
 * TODO(zowie): Rework how we pick the augmentation to for for next
 *  1.  Check for any aug we have the rep for
 *  2.  If we can't afford it find the lowest rep aug (can be different due to donations)
 *  3A. If none found return
 *  3B. Work for rep
 */
export default class UpgradeAugmentAction extends BaseAction {
  hackFocus: boolean

  constructor(hackFocus = false) {
    super()

    this.hackFocus = hackFocus
  }

  shouldPerform(ns: NS): boolean {
    const aug = getLowestMetRepAug(ns, this.hackFocus)
    return aug !== undefined && aug.meetMoney && aug.meetRep
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    const aug = getLowestMetRepAug(ns, this.hackFocus)
    return aug?.meetRepFaction !== undefined && ns.singularity.purchaseAugmentation(aug.meetRepFaction, aug.name)
  }

  isBackground(): boolean {
    return true
  }
}
