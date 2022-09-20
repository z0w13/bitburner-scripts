import { ScriptArg } from "@ns"

export type ScriptArgs = { [key: string]: ScriptArg }

// From https://github.com/danielyxie/bitburner/blob/a8bef50ef519f34e4387f5826e4b8f3998a764bb/src/Work/Work.ts#L21
export enum WorkType {
  CRIME = "CRIME",
  CLASS = "CLASS",
  CREATE_PROGRAM = "CREATE_PROGRAM",
  GRAFTING = "GRAFTING",
  FACTION = "FACTION",
  COMPANY = "COMPANY",
}

// From https://github.com/danielyxie/bitburner/blob/a8bef50ef519f34e4387f5826e4b8f3998a764bb/src/Work/ClassWork.tsx#L14
export enum ClassType {
  StudyComputerScience = "STUDYCOMPUTERSCIENCE",
  DataStructures = "DATASTRUCTURES",
  Networks = "NETWORKS",
  Algorithms = "ALGORITHMS",

  Management = "MANAGEMENT",
  Leadership = "LEADERSHIP",

  GymStrength = "GYMSTRENGTH",
  GymDefense = "GYMDEFENSE",
  GymDexterity = "GYMDEXTERITY",
  GymAgility = "GYMAGILITY",
}

export interface Work {
  type: WorkType,
  cyclesWorked: number,
}

export interface CompanyWork extends Work {
  type: WorkType.COMPANY,
  companyName: string,
}

export interface ClassWork extends Work{
  type: WorkType.CLASS,
  classType: ClassType,
  location: string,
}

export interface CreateProgramWork extends Work {
  type: WorkType.CREATE_PROGRAM,
  programName: string,
}

export interface CrimeWork extends Work {
  type: WorkType.CRIME,
  crimeType: string,
}

export interface FactionWork extends Work {
  type: WorkType.FACTION,
  factionWorkType: string,
  factionName: string,
}

export interface GraftingWork extends Work {
  type: WorkType.GRAFTING
  augmentation: string
}
