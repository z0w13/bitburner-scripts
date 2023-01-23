import type { NS } from "@ns"
import { FactionWorkType } from "/data/StaticDefs"
import { AugmentPurchaseInfo, getAvailableAugs } from "/data/Augments"
import { getHighestFavorFaction } from "/data/Factions"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import { sortFunc } from "/lib/util"
import BaseAction from "/PlayerManager/Actions/BaseAction"

function setDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  const diff = new Set(setA)
  setB.forEach((v) => diff.delete(v))
  return diff
}

export default class WorkForFactionAction extends BaseAction {
  private hackFocus: boolean
  private factionWorkMap: Record<string, Set<FactionWorkType>>
  private joinedFactions: Set<string>
  private unworkableFactions: Set<string>

  private isWorkableFaction = (faction: string): boolean => !this.unworkableFactions.has(faction)

  constructor(hackFocus = false) {
    super()

    this.hackFocus = hackFocus
    this.factionWorkMap = {}
    this.joinedFactions = new Set<string>()
    this.unworkableFactions = new Set<string>()
  }

  updateWorkMap(ns: NS) {
    const playerJoinedFactions = new Set(ns.getPlayer().factions)
    const newFactions = setDifference(playerJoinedFactions, this.joinedFactions)

    if (newFactions.size === 0) {
      return
    }

    const shouldFocus = !ns.singularity.getOwnedAugmentations().includes("Neuroreceptor Management Implant")

    // Loop over new factions and update each factions work map
    for (const faction of newFactions) {
      this.factionWorkMap[faction] = new Set()
      for (const workType of Object.values(FactionWorkType)) {
        if (ns.singularity.workForFaction(faction, workType, shouldFocus)) {
          this.factionWorkMap[faction].add(workType)
        }
      }
    }

    // Update unworkable factions
    this.unworkableFactions = new Set<string>(
      Object.keys(this.factionWorkMap).filter((f) => this.factionWorkMap[f].size === 0),
    )

    this.joinedFactions = playerJoinedFactions
  }

  getWorkableAug(ns: NS): AugmentPurchaseInfo | undefined {
    this.updateWorkMap(ns)

    const isWorkableAugment = (aug: AugmentPurchaseInfo): boolean => {
      const workableFactions = aug.factions.filter(this.isWorkableFaction)
      return workableFactions.length > 0
    }

    const getWorkableLeastRepRemaining = (aug: AugmentPurchaseInfo): number => {
      return (
        Math.max(...aug.factions.filter(this.isWorkableFaction).map((f) => ns.singularity.getFactionRep(f))) - aug.rep
      )
    }

    const aug = getAvailableAugs(ns, this.hackFocus)
      // Filter augments that are only available with factions we can't work for
      .filter(isWorkableAugment)
      // Sort by factions we can work for that have the least rep remaining
      .sort(sortFunc(getWorkableLeastRepRemaining, true))
      .at(0)

    return aug
  }

  getWorkableFactions(aug: AugmentPurchaseInfo): Array<string> {
    return aug.factions.filter(this.isWorkableFaction)
  }

  getWorkableAugAndFaction(ns: NS): { aug: AugmentPurchaseInfo; faction: string } | undefined {
    const aug = this.getWorkableAug(ns)
    if (!aug) {
      return
    }

    const faction = getHighestFavorFaction(ns, this.getWorkableFactions(aug))
    if (!faction) {
      return
    }

    return { aug, faction }
  }

  shouldPerform(ns: NS): boolean {
    const workInfo = this.getWorkableAugAndFaction(ns)
    if (!workInfo) {
      return false
    }

    return ns.singularity.getFactionRep(workInfo.faction) < workInfo.aug.rep
  }

  isPerforming(ns: NS): boolean {
    const action = getPlayerAction(ns)
    if (action.type !== PlayerActionType.WorkForFaction) {
      return false
    }

    const workInfo = this.getWorkableAugAndFaction(ns)
    if (!workInfo) {
      return false
    }

    return action.faction === workInfo.faction
  }

  async perform(ns: NS): Promise<boolean> {
    const workInfo = this.getWorkableAugAndFaction(ns)
    if (!workInfo) {
      return false
    }

    const shouldFocus = !ns.singularity.getOwnedAugmentations().includes("Neuroreceptor Management Implant")
    for (const type of this.factionWorkMap[workInfo.faction]) {
      if (ns.singularity.workForFaction(workInfo.faction, type, shouldFocus)) {
        return true
      }
    }

    return false
  }
}
