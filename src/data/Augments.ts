import { AugmentationStats, NS } from "@ns"
import { notNullMoreThanZero, sortFunc } from "/lib/util"

export interface AugmentPurchaseInfo {
  name: string
  rep: number
  price: number
  stats: AugmentationStats
  factions: Array<string>

  meetRep: boolean
  meetRepFaction?: string
  meetMoney: boolean
}

export function getAugmentPurchaseInfo(ns: NS): Array<AugmentPurchaseInfo> {
  const player = ns.getPlayer()
  const factions = player.factions as Array<string>

  const augs: Record<string, AugmentPurchaseInfo> = {}

  for (const faction of factions) {
    for (const aug of ns.getAugmentationsFromFaction(faction)) {
      const rep = ns.getAugmentationRepReq(aug)
      const money = ns.getAugmentationPrice(aug)
      const stats = ns.getAugmentationStats(aug)
      const meetRep = ns.getFactionRep(faction) >= rep

      if (aug in augs) {
        augs[aug].factions.push(faction)

        if (!augs[aug].meetRep && meetRep) {
          augs[aug].meetRep = true
          augs[aug].meetRepFaction = faction
        }
      } else {
        augs[aug] = {
          name: aug,
          rep: rep,
          price: money,
          stats,
          factions: [faction],

          meetRep,
          meetRepFaction: faction,
          meetMoney: player.money >= money,
        }
      }
    }
  }

  return Object.values(augs)
}

export function getAvailableAugs(ns: NS, hackFocus = false): Array<AugmentPurchaseInfo> {
  const augs = getAugmentPurchaseInfo(ns)
  if (augs.length === 0) {
    return []
  }

  const owned = ns.getOwnedAugmentations(true)
  return augs
    .filter((a) => !owned.includes(a.name) || a.name.includes("NeuroFlux Governor"))
    .sort(sortFunc((v) => Math.max(...v.factions.map((f) => ns.getFactionRep(f))) - v.rep, true))
    .filter(
      (a) =>
        !hackFocus ||
        notNullMoreThanZero(a.stats.hacking_chance_mult) ||
        notNullMoreThanZero(a.stats.hacking_exp_mult) ||
        notNullMoreThanZero(a.stats.hacking_grow_mult) ||
        notNullMoreThanZero(a.stats.hacking_money_mult) ||
        notNullMoreThanZero(a.stats.hacking_mult) ||
        notNullMoreThanZero(a.stats.hacking_speed_mult) ||
        notNullMoreThanZero(a.stats.faction_rep_mult) ||
        a.name === "CashRoot Starter Kit" ||
        a.name === "BitRunners Neurolink" ||
        a.name === "Neuroreceptor Management Implant",
    )
}

export function getLowestDonateAug(ns: NS, hackFocus = false): AugmentPurchaseInfo | undefined {
  const favorToDonate = ns.getFavorToDonate()

  return getAvailableAugs(ns, hackFocus)
    .filter((a) => !!a.factions.find((f) => ns.getFactionFavor(f) >= favorToDonate))
    .at(0)
}

export function getLowestMetRepAug(ns: NS, hackFocus = false): AugmentPurchaseInfo | undefined {
  return getAvailableAugs(ns, hackFocus).find((a) => a.meetRep)
}

export function getLowestRepAug(ns: NS, hackFocus = false): AugmentPurchaseInfo | undefined {
  return getAvailableAugs(ns, hackFocus)
    .filter((a) => !a.meetRep)
    .at(0)
}
