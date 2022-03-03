import { NS } from "@ns"
import { sortFunc } from "/lib/util"

export interface AugmentPurchaseInfo {
  name: string
  rep: number
  price: number
  factions: Array<string>
}

export function getAugmentPurchaseInfo(ns: NS): Array<AugmentPurchaseInfo> {
  const player = ns.getPlayer()
  const factions = player.factions as Array<string>

  const augs: Record<string, AugmentPurchaseInfo> = {}

  for (const faction of factions) {
    for (const aug of ns.getAugmentationsFromFaction(faction)) {
      const rep = ns.getAugmentationRepReq(aug)
      const money = ns.getAugmentationPrice(aug)

      if (aug in augs) {
        augs[aug].factions.push(faction)
      } else {
        augs[aug] = {
          name: aug,
          rep: rep,
          price: money,
          factions: [faction],
        }
      }
    }
  }

  return Object.values(augs)
}

export function getLowestRepAug(ns: NS): AugmentPurchaseInfo | undefined {
  const augs = getAugmentPurchaseInfo(ns)
  if (augs.length === 0) {
    return
  }

  const owned = ns.getOwnedAugmentations(true)
  return augs
    .filter((a) => !owned.includes(a.name) || a.name.includes("NeuroFlux Governor"))
    .sort(sortFunc((v) => v.rep))[0]
}
