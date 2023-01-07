import { NS } from "@ns"
import { CityName } from "/data/StaticDefs"
import {
  cityActionIsEqual,
  ActionType,
  ACTION_LIST,
  BladeburnerCityAction,
  Contract,
  GeneralAction,
  newAction,
  Operation,
  actionIsEqual,
  getCurrentAction,
  getAction,
  getContractMoney,
  BlackOp,
} from "/data/Bladeburner"
import { sortFunc } from "/lib/util"

import BaseAction from "/PlayerManager/Actions/BaseAction"

const MIN_CITY_POP = 1_000_000

const SAFE_CONTRACTS = [Contract.Tracking]
const SAFE_OPS = [Operation.Investigation, Operation.UndercoverOperation]

function getStaminaPct(curr: number, max: number): number {
  return curr / max
}

function getAverageSuccessChange(ns: NS, name: Contract | Operation): number {
  const action = getAction(name)
  const [min, max] = ns.bladeburner.getActionEstimatedSuccessChance(action.type, action.name)
  return min + (max - min) / 2
}

export function getBestContract(ns: NS): Contract | undefined {
  return Object.values(Contract)
    .filter((c) => ns.bladeburner.getActionCountRemaining(ActionType.Contract, c) > 100)
    .filter((c) => getAverageSuccessChange(ns, c) > 0.5)
    .filter((c) => currentCityPopIsAboveMinimum(ns) || SAFE_CONTRACTS.includes(c))
    .sort(sortFunc((c) => getContractMoney(ns, c), true))
    .at(-1)
}

function getBestOperation(ns: NS): Operation | undefined {
  return Object.values(Operation)
    .filter((op) => ns.bladeburner.getActionCountRemaining(ActionType.Operation, op) > 100)
    .filter((op) => getAverageSuccessChange(ns, op) > 0.5)
    .filter((op) => currentCityPopIsAboveMinimum(ns) || SAFE_OPS.includes(op))
    .at(-1)
}

function getNextBlackOp(ns: NS): BlackOp | undefined {
  return Object.values(BlackOp).find(
    (b) =>
      ns.bladeburner.getActionCountRemaining(ActionType.BlackOp, b) > 0 &&
      ns.bladeburner.getBlackOpRank(b) <= ns.bladeburner.getRank() &&
      ns.bladeburner.getActionEstimatedSuccessChance(ActionType.BlackOp, b)[0] > 0.99,
  )
}

export function getMoneyBeforeOps(ns: NS): number {
  const highestLevelContract = Object.values(Contract).sort(
    sortFunc((c) => ns.bladeburner.getActionCurrentLevel(ActionType.Contract, c), true),
  )[0]

  if (!highestLevelContract) {
    throw new Error("highestLevelContract is undefined or false, shouldn't be possible")
  }

  const contractsBeforeMet = 5 // How many contracts we want it to take to reach our goal
  return getContractMoney(ns, highestLevelContract) * contractsBeforeMet
}

export function getCityPops(ns: NS): Record<CityName, number> {
  return Object.fromEntries(
    Object.values(CityName).map((c) => [c, ns.bladeburner.getCityEstimatedPopulation(c)]),
  ) as Record<CityName, number>
}

function getHighestPopCity(ns: NS): CityName {
  const pops = getCityPops(ns)
  const typedEntries = Object.entries(pops) as Array<[CityName, number]>
  return typedEntries.sort(sortFunc(([_city, pop]) => pop, true))[0][0]
}

function isRecoveringStamina(ns: NS): boolean {
  const currentAction = getCurrentAction(ns)

  // Both field analysis and regen chamber are considered stamina regen actions
  return (
    actionIsEqual(currentAction, ACTION_LIST[GeneralAction.FieldAnalysis]) ||
    actionIsEqual(currentAction, ACTION_LIST[GeneralAction.HyperbolicRegenerationChamber])
  )
}

function getBestAction(ns: NS): BladeburnerCityAction {
  const currentAction = getCurrentAction(ns)
  const city = currentCityPopIsAboveMinimum(ns) ? currentAction.city : getHighestPopCity(ns)

  // Player initiated blackops, do not interrupt
  if (currentAction.type == ActionType.BlackOp) {
    return currentAction
  }

  const staminaPct = getStaminaPct(...ns.bladeburner.getStamina())

  // Keep recovering stamina if we're not above 90%
  if (isRecoveringStamina(ns) && staminaPct < 0.9) {
    return currentAction
  }

  // Recover stamina if below 50%
  if (staminaPct < 0.5) {
    const estimatedSuccess = ns.bladeburner.getActionEstimatedSuccessChance(ActionType.Contract, Contract.Retirement)
    const estimatedSuccessDiff = estimatedSuccess[1] - estimatedSuccess[0]

    // field analysis if success chances have a range of > 40%, otherwise regen chamber
    return newAction(
      estimatedSuccessDiff > 0.4 ? GeneralAction.FieldAnalysis : GeneralAction.HyperbolicRegenerationChamber,
      city,
    )
  }

  const blackOp = getNextBlackOp(ns)
  if (blackOp) {
    return newAction(blackOp, city)
  }

  const bestContract = getBestContract(ns)
  if (ns.getPlayer().money > getMoneyBeforeOps(ns)) {
    const bestOperation = getBestOperation(ns)
    if (bestOperation) {
      return newAction(bestOperation, city)
    }
  }

  if (!bestContract) {
    return newAction(GeneralAction.FieldAnalysis, city)
  }

  return newAction(bestContract, city)
}

function currentCityPopIsAboveMinimum(ns: NS): boolean {
  return ns.bladeburner.getCityEstimatedPopulation(ns.bladeburner.getCity()) > MIN_CITY_POP
}

export default class BladeburnerPerformAction extends BaseAction {
  shouldPerform(_ns: NS): boolean {
    return true
  }

  isPerforming(ns: NS): boolean {
    if (this.isBackground(ns)) {
      return false
    }

    return cityActionIsEqual(getCurrentAction(ns), getBestAction(ns))
  }

  async perform(ns: NS): Promise<boolean> {
    const action = getBestAction(ns)

    if (ns.bladeburner.getCity() !== action.city) {
      if (!ns.bladeburner.switchCity(action.city)) {
        return false
      }
    }

    return ns.bladeburner.startAction(action.type, action.name)
  }

  isBackground(ns: NS): boolean {
    return ns.singularity.getOwnedAugmentations().includes("The Blade's Simulacrum")
  }
}
