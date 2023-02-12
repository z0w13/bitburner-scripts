import { CrimeType, FactionWorkType, GymType, LocationName, UniversityClassType } from "@ns"

// From https://github.com/danielyxie/bitburner/blob/a8bef50ef519f34e4387f5826e4b8f3998a764bb/src/Work/Work.ts#L21
export enum WorkType {
  CRIME = "CRIME",
  CLASS = "CLASS",
  CREATE_PROGRAM = "CREATE_PROGRAM",
  GRAFTING = "GRAFTING",
  FACTION = "FACTION",
  COMPANY = "COMPANY",
}

interface BaseWork {
  type: WorkType
  cyclesWorked: number
}

export interface CompanyWork extends BaseWork {
  type: WorkType.COMPANY
  companyName: string
}

export interface ClassWork extends BaseWork {
  type: WorkType.CLASS
  classType: UniversityClassType | GymType
  location: LocationName
}

export interface CreateProgramWork extends BaseWork {
  type: WorkType.CREATE_PROGRAM
  programName: string
}

export interface CrimeWork extends BaseWork {
  type: WorkType.CRIME
  crimeType: CrimeType
}

export interface FactionWork extends BaseWork {
  type: WorkType.FACTION
  factionWorkType: FactionWorkType
  factionName: string
}

export interface GraftingWork extends BaseWork {
  type: WorkType.GRAFTING
  augmentation: string
}

export type Work = CompanyWork | ClassWork | CreateProgramWork | CrimeWork | FactionWork | GraftingWork
