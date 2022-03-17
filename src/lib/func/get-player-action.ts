import { NS } from "@ns"
import { CONSTANTS } from "/game-constants"

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
  rep: number
}

export function isWorkForCompanyAction(action: BasePlayerAction): action is PlayerWorkForCompanyAction {
  return action.type === PlayerActionType.WorkForCompany
}

export interface PlayerWorkForFactionAction extends BasePlayerAction {
  type: PlayerActionType.WorkForFaction
  faction: string
  rep: number
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
  const player = ns.getPlayer()
  switch (player.workType) {
    case CONSTANTS.WorkTypeCompany:
    case CONSTANTS.WorkTypeCompanyPartTime:
      return {
        type: PlayerActionType.WorkForCompany,
        focus: ns.isFocused(),
        company: player.currentWorkFactionName,
        rep: player.workRepGained,
      } as PlayerWorkForCompanyAction
    case CONSTANTS.WorkTypeFaction:
      return {
        type: PlayerActionType.WorkForFaction,
        focus: ns.isFocused(),
        faction: player.currentWorkFactionName,
        rep: player.workRepGained,
      } as PlayerWorkForFactionAction
    case CONSTANTS.WorkTypeCreateProgram:
      return {
        type: PlayerActionType.CreateProgram,
        focus: ns.isFocused(),
        program: player.createProgramName,
      } as PlayerCreateProgramAction
    case CONSTANTS.WorkTypeCrime:
      return {
        type: PlayerActionType.Crime,
        focus: ns.isFocused(),
        crime: player.crimeType,
      } as PlayerCrimeAction
    case CONSTANTS.WorkTypeStudyClass:
      if (player.location.includes("Gym")) {
        return {
          type: PlayerActionType.Exercise,
          focus: ns.isFocused(),
          gym: player.location,
          exercise: player.className,
        } as PlayerExerciseAction
      } else {
        return {
          type: PlayerActionType.Study,
          focus: ns.isFocused(),
          uni: player.location,
          course: player.className,
        } as PlayerStudyAction
      }
  }

  return {
    type: PlayerActionType.Idle,
    focus: false,
  }
}
