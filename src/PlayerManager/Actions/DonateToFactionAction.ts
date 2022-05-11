import { NS } from "@ns"
import { AugmentPurchaseInfo, getLowestDonateAug } from "/data/Augments"
import { sortFunc } from "/lib/util"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class DonateToFactionAction extends BaseAction {
  hackFocus: boolean

  constructor(hackFocus = false) {
    super()

    this.hackFocus = hackFocus
  }

  calcDonationAmount(ns: NS, faction: string, targetRep: number): number {
    const repMulti = ns.getPlayer().faction_rep_mult
    const repRequired = targetRep - ns.getFactionRep(faction)

    // Simplified formula to calculate donation amount for rep
    return Math.ceil((repRequired / repMulti) * 1_000_000)
  }

  getFaction(ns: NS, aug: AugmentPurchaseInfo): string | undefined {
    const favorToDonate = ns.getFavorToDonate()
    return aug.factions
      .filter((f) => ns.getFactionFavor(f) >= favorToDonate)
      .sort(sortFunc((f) => this.calcDonationAmount(ns, f, aug.rep), true))
      .at(0)
  }

  shouldPerform(ns: NS): boolean {
    const aug = getLowestDonateAug(ns, this.hackFocus)
    if (!aug) {
      return false
    }

    const faction = this.getFaction(ns, aug)
    if (!faction) {
      return false
    }

    const donateAmount = this.calcDonationAmount(ns, faction, aug.rep)
    if (donateAmount > ns.getPlayer().money) {
      return false
    }

    return ns.getFactionRep(faction) < aug.rep && ns.getFactionFavor(faction) >= ns.getFavorToDonate()
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    const aug = getLowestDonateAug(ns, this.hackFocus)
    if (!aug) {
      return false
    }

    const faction = this.getFaction(ns, aug)
    if (!faction) {
      return false
    }

    const donateAmount = this.calcDonationAmount(ns, faction, aug.rep)
    if (donateAmount > ns.getPlayer().money) {
      return false
    }

    return ns.donateToFaction(faction, donateAmount)
  }

  isBackground(): boolean {
    return true
  }

  shouldContinue(): boolean {
    return true
  }
}
