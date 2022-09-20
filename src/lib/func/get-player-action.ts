import { NS } from "@ns"
import {
  ClassWork,
  CompanyWork,
  CreateProgramWork,
  CrimeWork,
  FactionWork,
  Work,
  WorkType,
} from "/AdditionalNetscriptDefinitions"

export enum PlayerActionType {
  Idle = "Idle",
  WorkForCompany = "WorkForCompany",
  WorkForFaction = "WorkForFaction",
  Study = "Study",
  Exercise = "Exercise",
  CreateProgram = "CreateProgram",
  Crime = "Crime",
}

export interface BasePlayerAction {
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

export function isCreateProgramAction(action: BasePlayerAction): action is PlayerCreateProgramAction {
  return action.type === PlayerActionType.CreateProgram
}

export interface PlayerWorkForCompanyAction extends BasePlayerAction {
  type: PlayerActionType.WorkForCompany
  company: string
}

export function isWorkForCompanyAction(action: BasePlayerAction): action is PlayerWorkForCompanyAction {
  return action.type === PlayerActionType.WorkForCompany
}

export interface PlayerWorkForFactionAction extends BasePlayerAction {
  type: PlayerActionType.WorkForFaction
  faction: string
  workType: string
}

export function isWorkForFactionAction(action: BasePlayerAction): action is PlayerWorkForFactionAction {
  return action.type === PlayerActionType.WorkForFaction
}

export interface PlayerCrimeAction extends BasePlayerAction {
  type: PlayerActionType.Crime
  crime: string
}

export function isCrimeAction(action: BasePlayerAction): action is PlayerCrimeAction {
  return action.type === PlayerActionType.Crime
}

export interface PlayerStudyAction extends BasePlayerAction {
  type: PlayerActionType.Study
  uni: string
  course: string
}

export function isStudyAction(action: BasePlayerAction): action is PlayerStudyAction {
  return action.type === PlayerActionType.Study
}

export interface PlayerExerciseAction extends BasePlayerAction {
  type: PlayerActionType.Exercise
  gym: string
  exercise: string
}

export type PlayerAction =
  | PlayerIdleAction
  | PlayerCreateProgramAction
  | PlayerWorkForCompanyAction
  | PlayerWorkForFactionAction
  | PlayerCrimeAction
  | PlayerStudyAction
  | PlayerExerciseAction

export function isExerciseAction(action: BasePlayerAction): action is PlayerExerciseAction {
  return action.type === PlayerActionType.Exercise
}

export default function getPlayerAction(ns: NS): PlayerAction {
  const work = ns.singularity.getCurrentWork() as Work
  const focus = ns.singularity.isFocused()
  const player = ns.getPlayer()

  if (!work) {
    return {
      type: PlayerActionType.Idle,
      focus: false,
    } as PlayerIdleAction
  }

  switch (work.type) {
    case WorkType.COMPANY:
      return {
        type: PlayerActionType.WorkForCompany,
        company: (work as CompanyWork).companyName,
        focus,
      } as PlayerWorkForCompanyAction
    case WorkType.FACTION:
      return {
        type: PlayerActionType.WorkForFaction,
        workType: (work as FactionWork).factionWorkType,
        faction: (work as FactionWork).factionName,
        focus,
      } as PlayerWorkForFactionAction
    case WorkType.CREATE_PROGRAM:
      return {
        type: PlayerActionType.CreateProgram,
        program: (work as CreateProgramWork).programName,
        focus,
      } as PlayerCreateProgramAction
    case WorkType.CRIME:
      return {
        type: PlayerActionType.Crime,
        crime: (work as CrimeWork).crimeType,
        focus,
      } as PlayerCrimeAction
    case WorkType.CLASS:
      if (player.location.includes("Gym")) {
        return {
          type: PlayerActionType.Exercise,
          gym: (work as ClassWork).location,
          exercise: (work as ClassWork).classType,
          focus,
        } as PlayerExerciseAction
      } else {
        return {
          type: PlayerActionType.Study,
          uni: (work as ClassWork).location,
          course: (work as ClassWork).classType,
          focus,
        } as PlayerStudyAction
      }
  }

  return {
    type: PlayerActionType.Idle,
    focus: false,
  } as PlayerIdleAction
}
