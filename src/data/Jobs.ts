import { CompaniesMetadata } from "/data/CompanyMetadata"
import { companyPositionMetadata, CompanyPositionMetadata } from "/data/CompanyPositionsMetadata"
import { LocationName } from "/data/LocationNames"
import { CONSTANTS } from "/game-constants"
import { Attribute } from "/lib/objects"
import { sortFunc } from "/lib/util"

export interface Job {
  name: string
  company: LocationName
  salary: number
  requiredAttrib: Record<Attribute, number>
  requiredRep: number
}

function getPosition(name: string): CompanyPositionMetadata | null {
  for (const pos of companyPositionMetadata) {
    if (pos.name === name) {
      return pos
    }
  }

  return null
}

export const Jobs: ReadonlyArray<Job> = CompaniesMetadata.flatMap((meta) =>
  Object.keys(meta.companyPositions).map((pos) => {
    const positionMeta = getPosition(pos)
    if (!positionMeta) {
      return
    }

    return {
      name: pos,
      company: meta.name,
      salary: positionMeta.baseSalary * meta.salaryMultiplier,
      requiredAttrib: {
        [Attribute.HACKING]: positionMeta?.reqdHacking ? positionMeta.reqdHacking + meta.jobStatReqOffset : 0,
        [Attribute.STRENGTH]: positionMeta?.reqdStrength ? positionMeta.reqdStrength + meta.jobStatReqOffset : 0,
        [Attribute.DEFENSE]: positionMeta?.reqdDefense ? positionMeta.reqdDefense + meta.jobStatReqOffset : 0,
        [Attribute.AGILITY]: positionMeta?.reqdAgility ? positionMeta.reqdAgility + meta.jobStatReqOffset : 0,
        [Attribute.DEXTERITY]: positionMeta?.reqdDexterity ? positionMeta.reqdDexterity + meta.jobStatReqOffset : 0,
        [Attribute.CHARISMA]: positionMeta?.reqdCharisma ? positionMeta.reqdCharisma + meta.jobStatReqOffset : 0,
      },
      requiredRep: positionMeta?.reqdReputation ?? 0,
    }
  }),
).filter<Job>((v): v is Job => v !== undefined)

export function getBestJob(ns: NS): Job | null {
  for (const job of [...Jobs].sort(sortFunc((v) => v.salary, false))) {
    if (job.requiredRep > ns.getCompanyRep(job.company)) {
      continue
    }

    const player = ns.getPlayer()
    if (job.requiredAttrib[Attribute.HACKING] > player.hacking) {
      continue
    }
    if (job.requiredAttrib[Attribute.STRENGTH] > player.strength) {
      continue
    }
    if (job.requiredAttrib[Attribute.DEFENSE] > player.defense) {
      continue
    }
    if (job.requiredAttrib[Attribute.AGILITY] > player.agility) {
      continue
    }
    if (job.requiredAttrib[Attribute.DEXTERITY] > player.dexterity) {
      continue
    }
    if (job.requiredAttrib[Attribute.CHARISMA] > player.charisma) {
      continue
    }

    return {
      ...job,

      salary: job.salary * ns.getPlayer().work_money_mult * 0.1 * (1000 / CONSTANTS.MilliPerCycle),
    }
  }

  return null
}
