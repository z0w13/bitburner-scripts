import type { NS } from "@ns"
import { CityName } from "/data/StaticDefs"

function normalizeEnumName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "")
}

function generateEnums(ns: NS) {
  const resultLines = []
  resultLines.push("export enum Contract {")
  for (const name of ns.bladeburner.getContractNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export enum Operation {")
  for (const name of ns.bladeburner.getOperationNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export enum GeneralAction {")
  for (const name of ns.bladeburner.getGeneralActionNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export enum BlackOp {")
  for (const name of ns.bladeburner.getBlackOpNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export enum Skill {")
  for (const name of ns.bladeburner.getSkillNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export const ACTION_LIST: Record<ActionName, BladeburnerAction> = {")
  for (const name of ns.bladeburner.getGeneralActionNames()) {
    const normalName = normalizeEnumName(name)
    resultLines.push(`  [${normalName}]: {type: ActionType.General, name: GeneralAction.${normalName}}`)
  }
  resultLines.push("")
  for (const name of ns.bladeburner.getContractNames()) {
    const normalName = normalizeEnumName(name)
    resultLines.push(`  [${normalName}]: {type: ActionType.Contract, name: Contract.${normalName}}`)
  }
  resultLines.push("")
  for (const name of ns.bladeburner.getOperationNames()) {
    const normalName = normalizeEnumName(name)
    resultLines.push(`  [${normalName}]: {type: ActionType.Operation, name: Operation.${normalName}}`)
  }
  resultLines.push("")
  for (const name of ns.bladeburner.getBlackOpNames()) {
    const normalName = normalizeEnumName(name)
    resultLines.push(`  [${normalName}]: {type: ActionType.BlackOp, name: BlackOp.${normalName}}`)
  }
  resultLines.push("}")

  ns.tprintf("%s", resultLines.join("\n"))
}

export interface BladeburnerAction {
  type: ActionType
  name: Contract | Operation | GeneralAction | BlackOp
}

export interface BladeburnerCityAction extends BladeburnerAction {
  city: CityName
}

export function getCurrentAction(ns: NS): BladeburnerCityAction {
  return {
    city: ns.bladeburner.getCity(),

    ...(ns.bladeburner.getCurrentAction() as BladeburnerAction),
  }
}

export function actionForCity(action: Action, city: CityName): BladeburnerCityAction {
  return {
    ...ACTION_LIST[action],

    city,
  }
}

export function cityActionIsEqual(actionA: BladeburnerCityAction, actionB: BladeburnerCityAction): boolean {
  return actionIsEqual(actionA, actionB) && actionA.city.toLowerCase() === actionB.city.toLowerCase()
}

export function actionIsEqual(actionA: BladeburnerAction, actionB: BladeburnerAction): boolean {
  return (
    actionA.type.toLowerCase() === actionB.type.toLowerCase() &&
    actionA.name.toLowerCase() === actionB.name.toLowerCase()
  )
}

export function newAction(name: Action, city: CityName): BladeburnerCityAction {
  return {
    ...ACTION_LIST[name],

    city,
  }
}

export function getAction(name: Action): BladeburnerAction {
  return ACTION_LIST[name]
}

export function getContractMoney(ns: NS, contract: Contract): number {
  // https://github.com/danielyxie/bitburner/blob/be553f3548b0082794f7aa12c594d6dad8b91336/src/Bladeburner/data/Constants.ts#L55
  const baseMoneyGain = 250_000
  // https://github.com/danielyxie/bitburner/blob/14914eb190945a8a476984d65ec428c9fcb06672/src/Bladeburner/Bladeburner.tsx#L1695
  const rewardFacs = {
    [Contract.Tracking]: 1.041,
    [Contract.BountyHunter]: 1.085,
    [Contract.Retirement]: 1.065,
  }

  const rewardFac = rewardFacs[contract]
  const contractLevel = ns.bladeburner.getActionCurrentLevel(ActionType.Contract, contract)
  const midasLevel = ns.bladeburner.getSkillLevel(Skill.HandsofMidas)
  const moneyMult = 1 + midasLevel * 0.1

  // Adapted from https://github.com/danielyxie/bitburner/blob/68e90b8e6eddd68a6ebf1406b527131056aa7015/src/Bladeburner/Bladeburner.tsx#L1263
  const rewardMultiplier = Math.pow(rewardFac, contractLevel - 1)
  return baseMoneyGain * rewardMultiplier * moneyMult
}

export enum Contract {
  "Tracking" = "Tracking",
  "BountyHunter" = "Bounty Hunter",
  "Retirement" = "Retirement",
}

export enum Operation {
  "Investigation" = "Investigation",
  "UndercoverOperation" = "Undercover Operation",
  "StingOperation" = "Sting Operation",
  "Raid" = "Raid",
  "StealthRetirementOperation" = "Stealth Retirement Operation",
  "Assassination" = "Assassination",
}

export enum GeneralAction {
  "Training" = "Training",
  "FieldAnalysis" = "Field Analysis",
  "Recruitment" = "Recruitment",
  "Diplomacy" = "Diplomacy",
  "HyperbolicRegenerationChamber" = "Hyperbolic Regeneration Chamber",
  "InciteViolence" = "Incite Violence",
}

export enum BlackOp {
  "OperationTyphoon" = "Operation Typhoon",
  "OperationZero" = "Operation Zero",
  "OperationX" = "Operation X",
  "OperationTitan" = "Operation Titan",
  "OperationAres" = "Operation Ares",
  "OperationArchangel" = "Operation Archangel",
  "OperationJuggernaut" = "Operation Juggernaut",
  "OperationRedDragon" = "Operation Red Dragon",
  "OperationK" = "Operation K",
  "OperationDeckard" = "Operation Deckard",
  "OperationTyrell" = "Operation Tyrell",
  "OperationWallace" = "Operation Wallace",
  "OperationShoulderofOrion" = "Operation Shoulder of Orion",
  "OperationHyron" = "Operation Hyron",
  "OperationMorpheus" = "Operation Morpheus",
  "OperationIonStorm" = "Operation Ion Storm",
  "OperationAnnihilus" = "Operation Annihilus",
  "OperationUltron" = "Operation Ultron",
  "OperationCenturion" = "Operation Centurion",
  "OperationVindictus" = "Operation Vindictus",
  "OperationDaedalus" = "Operation Daedalus",
}

export enum Skill {
  "BladesIntuition" = "Blade's Intuition",
  "Cloak" = "Cloak",
  "ShortCircuit" = "Short-Circuit",
  "DigitalObserver" = "Digital Observer",
  "Tracer" = "Tracer",
  "Overclock" = "Overclock",
  "Reaper" = "Reaper",
  "EvasiveSystem" = "Evasive System",
  "Datamancer" = "Datamancer",
  "CybersEdge" = "Cyber's Edge",
  "HandsofMidas" = "Hands of Midas",
  "Hyperdrive" = "Hyperdrive",
}

export enum ActionType {
  Operation = "Operation",
  Contract = "Contract",
  General = "General",
  BlackOp = "BlackOp",
  Idle = "Idle",
}

export type Action = GeneralAction | Contract | Operation | BlackOp

export const ACTION_LIST: Record<Action, BladeburnerAction> = {
  [GeneralAction.Diplomacy]: { type: ActionType.General, name: GeneralAction.Diplomacy },
  [GeneralAction.FieldAnalysis]: { type: ActionType.General, name: GeneralAction.FieldAnalysis },
  [GeneralAction.HyperbolicRegenerationChamber]: {
    type: ActionType.General,
    name: GeneralAction.HyperbolicRegenerationChamber,
  },
  [GeneralAction.InciteViolence]: { type: ActionType.General, name: GeneralAction.InciteViolence },
  [GeneralAction.Recruitment]: { type: ActionType.General, name: GeneralAction.Recruitment },
  [GeneralAction.Training]: { type: ActionType.General, name: GeneralAction.Training },

  [Contract.BountyHunter]: { type: ActionType.Contract, name: Contract.BountyHunter },
  [Contract.Retirement]: { type: ActionType.Contract, name: Contract.Retirement },
  [Contract.Tracking]: { type: ActionType.Contract, name: Contract.Tracking },

  [Operation.Assassination]: { type: ActionType.Operation, name: Operation.Assassination },
  [Operation.Investigation]: { type: ActionType.Operation, name: Operation.Investigation },
  [Operation.Raid]: { type: ActionType.Operation, name: Operation.Raid },
  [Operation.StealthRetirementOperation]: { type: ActionType.Operation, name: Operation.StealthRetirementOperation },
  [Operation.StingOperation]: { type: ActionType.Operation, name: Operation.StingOperation },
  [Operation.UndercoverOperation]: { type: ActionType.Operation, name: Operation.UndercoverOperation },

  [BlackOp.OperationAnnihilus]: { type: ActionType.BlackOp, name: BlackOp.OperationAnnihilus },
  [BlackOp.OperationArchangel]: { type: ActionType.BlackOp, name: BlackOp.OperationArchangel },
  [BlackOp.OperationAres]: { type: ActionType.BlackOp, name: BlackOp.OperationAres },
  [BlackOp.OperationCenturion]: { type: ActionType.BlackOp, name: BlackOp.OperationCenturion },
  [BlackOp.OperationDaedalus]: { type: ActionType.BlackOp, name: BlackOp.OperationDaedalus },
  [BlackOp.OperationDeckard]: { type: ActionType.BlackOp, name: BlackOp.OperationDeckard },
  [BlackOp.OperationHyron]: { type: ActionType.BlackOp, name: BlackOp.OperationHyron },
  [BlackOp.OperationIonStorm]: { type: ActionType.BlackOp, name: BlackOp.OperationIonStorm },
  [BlackOp.OperationJuggernaut]: { type: ActionType.BlackOp, name: BlackOp.OperationJuggernaut },
  [BlackOp.OperationK]: { type: ActionType.BlackOp, name: BlackOp.OperationK },
  [BlackOp.OperationMorpheus]: { type: ActionType.BlackOp, name: BlackOp.OperationMorpheus },
  [BlackOp.OperationRedDragon]: { type: ActionType.BlackOp, name: BlackOp.OperationRedDragon },
  [BlackOp.OperationShoulderofOrion]: { type: ActionType.BlackOp, name: BlackOp.OperationShoulderofOrion },
  [BlackOp.OperationTitan]: { type: ActionType.BlackOp, name: BlackOp.OperationTitan },
  [BlackOp.OperationTyphoon]: { type: ActionType.BlackOp, name: BlackOp.OperationTyphoon },
  [BlackOp.OperationTyrell]: { type: ActionType.BlackOp, name: BlackOp.OperationTyrell },
  [BlackOp.OperationUltron]: { type: ActionType.BlackOp, name: BlackOp.OperationUltron },
  [BlackOp.OperationVindictus]: { type: ActionType.BlackOp, name: BlackOp.OperationVindictus },
  [BlackOp.OperationWallace]: { type: ActionType.BlackOp, name: BlackOp.OperationWallace },
  [BlackOp.OperationX]: { type: ActionType.BlackOp, name: BlackOp.OperationX },
  [BlackOp.OperationZero]: { type: ActionType.BlackOp, name: BlackOp.OperationZero },
}
