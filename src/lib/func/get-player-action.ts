import type { CrimeType, FactionWorkType, GymType, NS, UniversityClassType } from "@ns"
import { WorkType, Work } from "/AdditionalNetscriptDefinitions"

export enum PlayerActionType {
  Idle = "Idle",
  WorkForCompany = "WorkForCompany",
  WorkForFaction = "WorkForFaction",
  Study = "Study",
  Exercise = "Exercise",
  CreateProgram = "CreateProgram",
  Crime = "Crime",
  Grafting = "Grafting",
}

interface BasePlayerAction {
  type: PlayerActionType
  focus: boolean
}

export interface PlayerIdleAction extends BasePlayerAction {
  type: PlayerActionType.Idle
}

export interface PlayerCreateProgramAction extends BasePlayerAction {
  type: PlayerActionType.CreateProgram
  program: string
}

export interface PlayerWorkForCompanyAction extends BasePlayerAction {
  type: PlayerActionType.WorkForCompany
  company: string
}

export interface PlayerWorkForFactionAction extends BasePlayerAction {
  type: PlayerActionType.WorkForFaction
  faction: string
  workType: FactionWorkType
}

export interface PlayerCrimeAction extends BasePlayerAction {
  type: PlayerActionType.Crime
  crime: CrimeType
}

export interface PlayerStudyAction extends BasePlayerAction {
  type: PlayerActionType.Study
  uni: string
  course: UniversityClassType
}

export interface PlayerExerciseAction extends BasePlayerAction {
  type: PlayerActionType.Exercise
  gym: string
  exercise: GymType
}

export interface PlayerGraftingAction extends BasePlayerAction {
  type: PlayerActionType.Grafting
  augmentation: string
}

export type PlayerAction =
  | PlayerIdleAction
  | PlayerCreateProgramAction
  | PlayerWorkForCompanyAction
  | PlayerWorkForFactionAction
  | PlayerCrimeAction
  | PlayerStudyAction
  | PlayerExerciseAction
  | PlayerGraftingAction

export default function getPlayerAction(ns: NS): PlayerAction {
  const work = ns.singularity.getCurrentWork() as Work
  const focus = ns.singularity.isFocused()

  if (!work) {
    return {
      type: PlayerActionType.Idle,
      focus: false,
    } as PlayerIdleAction
  }

  switch (work.type) {
    case WorkType.CLASS:
      if (work.location.includes("Gym")) {
        return {
          type: PlayerActionType.Exercise,
          gym: work.location,
          exercise: work.classType,
          focus,
        } as PlayerExerciseAction
      } else {
        return {
          type: PlayerActionType.Study,
          uni: work.location,
          course: work.classType,
          focus,
        } as PlayerStudyAction
      }
      break
    case WorkType.COMPANY:
      return {
        type: PlayerActionType.WorkForCompany,
        company: work.companyName,
        focus,
      } as PlayerWorkForCompanyAction
      break
    case WorkType.CREATE_PROGRAM:
      return {
        type: PlayerActionType.CreateProgram,
        program: work.programName,
        focus,
      } as PlayerCreateProgramAction
      break
    case WorkType.CRIME:
      return {
        type: PlayerActionType.Crime,
        crime: work.crimeType,
        focus,
      } as PlayerCrimeAction
      break
    case WorkType.FACTION:
      return {
        type: PlayerActionType.WorkForFaction,
        workType: work.factionWorkType,
        faction: work.factionName,
        focus,
      } as PlayerWorkForFactionAction
      break
    case WorkType.GRAFTING:
      return {
        type: PlayerActionType.Grafting,
        augmentation: work.augmentation,
        focus,
      } as PlayerGraftingAction
  }
}
