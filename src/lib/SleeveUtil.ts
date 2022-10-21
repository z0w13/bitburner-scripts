import { NS, SleeveInformation, SleeveSkills } from "@ns"

export enum SleeveTaskType {
  Crime = "CRIME",
  Faction = "FACTION",
  Idle = "IDLE",
  Class = "CLASS", // Both gym & university
}

export interface SleeveTask {
  type: SleeveTaskType
  // Crime task
  crimeType?: string

  // Faction work task
  factionWorkType?: string
  factionName?: string

  // Class task
  classType?: string
  location?: string
}

export interface SleeveData {
  index: number
  info: SleeveInformation
  skill: SleeveSkills
  task: SleeveTask
}

function sleeveTaskCoerce(task: unknown): SleeveTask {
  if (!task) {
    return {
      type: SleeveTaskType.Idle,
    }
  }

  return task as SleeveTask
}

export function getSleeves(ns: NS): Array<SleeveData> {
  return [...Array(ns.sleeve.getNumSleeves())].map((_val, idx) => ({
    index: idx,
    info: ns.sleeve.getInformation(idx),
    skill: ns.sleeve.getSleeveStats(idx),
    task: sleeveTaskCoerce(ns.sleeve.getTask(idx)),
  }))
}
