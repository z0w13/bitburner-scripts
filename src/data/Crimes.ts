import { NS } from "@ns"
import getStaticData from "/lib/func/get-static-data"
import { sortFunc } from "/lib/util"

export interface Crime {
  name: string
  chance: number
  profitPerSec: number
}

export function getCrimes(ns: NS): Array<Crime> {
  const crimeStats = getStaticData(ns)?.crimes
  if (!crimeStats) {
    return []
  }

  return crimeStats.map((crime) => {
    const name = crime.name
    const chance = ns.singularity.getCrimeChance(crime.name)
    const profitPerSec = (crime.money / (crime.time / 1000)) * chance

    return {
      name,
      chance,
      profitPerSec,
    }
  })
}

export function getBestCrime(ns: NS): Crime | null {
  const crimes = getCrimes(ns).sort(sortFunc((v) => v.profitPerSec, true))
  return crimes[0].profitPerSec > 1 ? crimes[0] : null
}
