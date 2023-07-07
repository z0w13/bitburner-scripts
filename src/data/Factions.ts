import type { NS } from "@ns"
import { sortFunc } from "@/lib/util"

export function getFactionsSortedByFavour(ns: NS, factions: Array<string>): Array<{ name: string; favor: number }> {
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

export interface FactionJoinRequirements {
  backdoor?: string
  hacking?: number
  combat?: number
  money?: number
  augments?: number
  megacorp?: string
  city?: ReadonlyArray<string>
  killed?: number
  karma?: number
  enemies?: ReadonlyArray<string>
  enemyCorps?: ReadonlyArray<string>
}

export const FactionJoinRequirementData: Record<string, FactionJoinRequirements> = {
  ECorp: {
    megacorp: "ECorp",
  },
  MegaCorp: {
    megacorp: "MegaCorp",
  },
  "Bachman & Associates": {
    megacorp: "Bachman & Associates",
  },
  "Blade Industries": {
    megacorp: "Blade Industries",
  },
  NWO: {
    megacorp: "NWO",
  },
  "Clarke Incorporated": {
    megacorp: "Clarke Incorporated",
  },
  "OmniTek Incorporated": {
    megacorp: "OmniTek Incorporated",
  },
  "Four Sigma": {
    megacorp: "Four Sigma",
  },
  "KuaiGong International": {
    megacorp: "KuaiGong International",
  },
  Chongqing: {
    money: 20_000_000,
    city: ["Chongqing"],
    enemies: ["Sector-12", "Aevum", "Volhaven"],
  },
  "Sector-12": {
    money: 15_000_000,
    city: ["Sector-12"],
    enemies: ["Chongqing", "New Tokyo", "Ishima", "Volhaven"],
  },
  "New Tokyo": {
    money: 20_000_000,
    city: ["New Tokyo"],
    enemies: ["Sector-12", "Aevum", "volhaven"],
  },
  Aevum: {
    money: 40_000_000,
    city: ["Aevum"],
    enemies: ["Chongqing", "New Tokyo", "Ishima", "Volhaven"],
  },
  Ishima: {
    money: 30_000_000,
    city: ["Ishima"],
    enemies: ["Sector-12", "Aevum", "Volhaven"],
  },
  Volhaven: {
    money: 50_000_000,
    city: ["Volhaven"],
    enemies: ["Chongqing", "Sector-12", "New Tokyo", "Aevum", "Ishima"],
  },
  "Speakers for the Dead": {
    hacking: 100,
    combat: 300,
    killed: 30,
    karma: -45,
    enemyCorps: ["CIA", "NSA"],
  },
  "The Dark Army": {
    hacking: 300,
    combat: 300,
    city: ["Chongqing"],
    killed: 5,
    karma: -45,
    enemyCorps: ["CIA", "NSA"],
  },
  "The Syndicate": {
    hacking: 200,
    combat: 200,
    city: ["Aevum", "Sector-12"],
    money: 10_000_000,
    karma: -90,
    enemyCorps: ["CIA", "NSA"],
  },
  Silhouette: {
    money: 15_000_000,
    karma: -22,
  },
  Tetrads: {
    city: ["Chongqing", "New Tokyo", "Ishima"],
    combat: 75,
    karma: -18,
  },
  "Slum Snakes": {
    combat: 30,
    karma: -9,
    money: 1_000_000,
  },
  Netburners: {
    hacking: 80,
    // Hacknet stuff
  },
  "Tian Di Hui": {
    money: 1_000_000,
    hacking: 50,
    city: ["Chongqing", "New Tokyo", "Ishima"],
  },
  CyberSec: {
    backdoor: "CSEC",
  },
  BitRunners: {
    backdoor: "run4theh111z",
  },
  "The Black Hand": {
    backdoor: "I.I.I.I",
  },
  NiteSec: {
    backdoor: "avmnite-02h",
  },
  "Fulcrum Secret Technologies": {
    backdoor: "fulcrumassets",
    megacorp: "Fullcrum Secret Technologies",
  },
  Illuminati: {
    money: 150_000_000_000,
    hacking: 1_500,
    combat: 1_200,
    augments: 30,
  },
  Daedalus: {
    money: 100_000_000_000,
    hacking: 2_500,
    combat: 1_500,
  },
  "The Covenant": {
    augments: 20,
    hacking: 850,
    combat: 850,
    money: 75_000_000_000,
  },
}
