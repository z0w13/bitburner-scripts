import type { NS } from "@ns"
import { sortFunc } from "@/lib/util"
import { CrimeType } from "@/data/StaticDefs"

export enum Crimes {
  Homicide = "Homicide",
}

export interface Crime {
  name: CrimeType
  chance: number
  profitPerSec: number
}

export function getCrimes(ns: NS): Array<Crime> {
  return Object.values(CrimeType).map((name) => {
    const crime = ns.singularity.getCrimeStats(name)
    const chance = ns.singularity.getCrimeChance(name)
    const profitPerSec = (crime.money / (crime.time / 1000)) * chance

    return {
      name: name,
      chance,
      profitPerSec,
    }
  })
}

export function getBestCrime(ns: NS): Crime | null {
  const crimes = getCrimes(ns).sort(sortFunc((v) => v.profitPerSec, true))
  return crimes[0].profitPerSec > 1 ? crimes[0] : null
}
