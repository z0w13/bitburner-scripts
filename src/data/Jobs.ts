import { NS } from "@ns"
import type { LocationName } from "@ns"
import { CompaniesMetadata } from "@/data/CompanyMetadata"
import { companyPositionMetadata, CompanyPositionMetadata } from "@/data/CompanyPositionsMetadata"
import { Attribute } from "@/lib/objects"
import { sortFunc } from "@/lib/util"

const MilliPerCycle = 200

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
    if (job.requiredRep > ns.singularity.getCompanyRep(job.company)) {
      continue
    }

    const player = ns.getPlayer()
    if (job.requiredAttrib[Attribute.HACKING] > player.skills.hacking) {
      continue
    }
    if (job.requiredAttrib[Attribute.STRENGTH] > player.skills.strength) {
      continue
    }
    if (job.requiredAttrib[Attribute.DEFENSE] > player.skills.defense) {
      continue
    }
    if (job.requiredAttrib[Attribute.AGILITY] > player.skills.agility) {
      continue
    }
    if (job.requiredAttrib[Attribute.DEXTERITY] > player.skills.dexterity) {
      continue
    }
    if (job.requiredAttrib[Attribute.CHARISMA] > player.skills.charisma) {
      continue
    }

    return {
      ...job,

      salary: job.salary * (ns.getPlayer().mults.work_money || 1) * 0.1 * (1000 / MilliPerCycle),
    }
  }

  return null
}
