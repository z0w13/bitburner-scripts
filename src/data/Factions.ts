import { NS } from "@ns"
import { sortFunc } from "/lib/util"

function getFactionsSortedByFavour(ns: NS, factions: Array<string>): Array<{ name: string; favor: number }> {
  const inGang = ns.gang.inGang()

  const factionsByFavour = factions
    .map((f) => ({ name: f, favor: ns.singularity.getFactionFavor(f) }))
    .sort(sortFunc((f) => f.favor, true))

  if (inGang) {
    const gangFaction = ns.gang.getGangInformation().faction
    return factionsByFavour.filter((v) => (inGang ? v.name !== gangFaction : true))
  }

  return factionsByFavour
}

export function getHighestFavorFaction(ns: NS, factions: Array<string>): string | null {
  const factionsByFavour = getFactionsSortedByFavour(ns, factions)
  return factionsByFavour.length > 0 ? factionsByFavour[0].name : null
}
