import { NS } from "@ns"
import { sortFunc } from "/lib/util"

export function getHighestFavorFaction(ns: NS, factions: Array<string>): string {
  return factions.map((f) => ({ name: f, favor: ns.getFactionFavor(f) })).sort(sortFunc((f) => f.favor, true))[0].name
}
