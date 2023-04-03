import type { NS } from "@ns"
import { CityName } from "@/data/StaticDefs"
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
  BladeburnerAction,
} from "@/data/Bladeburner"
import { sortFunc, sum } from "@/lib/util"

import BaseAction from "@/PlayerManager/Actions/BaseAction"

const MIN_CITY_POP = 1_000_000

const MIN_ACTION_COUNT = 100 // Minimum amount of op/contract available to run
const MIN_SUCCESS_CHANCE = 0.5 // Only run ops/contracts if > 50% chance to succeed

const SAFE_CONTRACTS = [Contract.Tracking]
const SAFE_OPS = [Operation.Investigation, Operation.UndercoverOperation]

export function getTotalBlackOps(): number {
  return Object.values(BlackOp).length
}

export function getFinishedBlackOps(ns: NS): number {
  return Object.values(BlackOp).filter((b) => ns.bladeburner.getActionCountRemaining(ActionType.BlackOp, b) === 0)
    .length
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function areAllBlackOpsFinished(ns: NS): boolean {
  return getTotalBlackOps() === getFinishedBlackOps(ns)
}

function getStaminaPct(curr: number, max: number): number {
  return curr / max
}

function getAverageSuccessChance(ns: NS, name: Contract | Operation): number {
  const action = getAction(name)
  const [min, max] = ns.bladeburner.getActionEstimatedSuccessChance(action.type, action.name)
  return min + (max - min) / 2
}

export function getLeveledActionEstimatedSuccessChance(
  ns: NS,
  action: BladeburnerAction,
  level: number,
): [number, number] {
  const origLevel = ns.bladeburner.getActionCurrentLevel(action.type, action.name)

  // Don't mess with the level if it's the same as current, as otherwise we'll reset action progress
  if (origLevel === level) {
    return ns.bladeburner.getActionEstimatedSuccessChance(action.type, action.name)
  }

  ns.bladeburner.setActionLevel(action.type, action.name, level)
  const successChance = ns.bladeburner.getActionEstimatedSuccessChance(action.type, action.name)
  ns.bladeburner.setActionLevel(action.type, action.name, origLevel)

  return successChance
}

export function getMinSuccessLevel(ns: NS, contract: Contract): number | undefined {
  while (true) {
    const currentLevel = ns.bladeburner.getActionCurrentLevel(ActionType.Contract, contract)
    const successChance = getAverageSuccessChance(ns, contract)

    if (successChance > MIN_SUCCESS_CHANCE) {
      return currentLevel
    }

    ns.bladeburner.setActionLevel(ActionType.Contract, contract, currentLevel - 1)
  }
}

export function getBestLeveledContract(ns: NS): { contract: Contract; level: number } | undefined {
  const contractList: Array<{ contract: Contract; level: number; moneyPerSec: number }> = []
  for (const contract of Object.values(Contract)) {
    const maxLevel = ns.bladeburner.getActionMaxLevel(ActionType.Contract, contract)
    const currentLevel = ns.bladeburner.getActionCurrentLevel(ActionType.Contract, contract)
    if (currentLevel !== maxLevel) {
      ns.bladeburner.setActionLevel(ActionType.Contract, contract, maxLevel)
    }

    while (true) {
      const currentLevel = ns.bladeburner.getActionCurrentLevel(ActionType.Contract, contract)
      const successChance = getAverageSuccessChance(ns, contract)
      if (currentLevel === 1) {
        break
      }

      if (successChance > MIN_SUCCESS_CHANCE) {
        break
      }

      ns.bladeburner.setActionLevel(ActionType.Contract, contract, currentLevel - 1)
    }

    const highestLevel = ns.bladeburner.getActionCurrentLevel(ActionType.Contract, contract)
    const money = getContractMoney(ns, contract)
    const timeInSecs = ns.bladeburner.getActionTime(ActionType.Contract, contract) / 1000

    ns.bladeburner.setActionLevel(ActionType.Contract, contract, currentLevel) // Reset action level to what it was before calling this method

    contractList.push({ contract, level: highestLevel, moneyPerSec: money / timeInSecs })
  }

  if (contractList.length === 0) {
    return
  }

  return contractList.sort(sortFunc((c) => c.moneyPerSec, true))[0]
}

export function getBestContract(ns: NS): Contract | undefined {
  return Object.values(Contract)
    .filter((c) => ns.bladeburner.getActionCountRemaining(ActionType.Contract, c) > MIN_ACTION_COUNT)
    .filter((c) => getAverageSuccessChance(ns, c) > MIN_SUCCESS_CHANCE)
    .filter((c) => currentCityPopIsAboveMinimum(ns) || SAFE_CONTRACTS.includes(c))
    .sort(sortFunc((c) => getContractMoney(ns, c), true))
    .at(-1)
}

function getBestOperation(ns: NS): Operation | undefined {
  return Object.values(Operation)
    .filter((op) => ns.bladeburner.getActionCountRemaining(ActionType.Operation, op) > 100)
    .filter((op) => getAverageSuccessChance(ns, op) > 0.5)
    .filter((op) => currentCityPopIsAboveMinimum(ns) || SAFE_OPS.includes(op))
    .at(-1)
}

export function getLongestContractTime(ns: NS): number {
  return Math.max(...Object.values(Contract).map((c) => ns.bladeburner.getActionTime(ActionType.Contract, c)))
}
export function getLongestOperationTime(ns: NS): number {
  return Math.max(...Object.values(Operation).map((op) => ns.bladeburner.getActionTime(ActionType.Operation, op)))
}

export function getLongestContractOrOperationTime(ns: NS): number {
  return Math.max(getLongestContractTime(ns), getLongestOperationTime(ns))
}

export function getTotalContractSuccesses(ns: NS): number {
  return sum(Object.values(Contract).map((c) => ns.bladeburner.getActionSuccesses(ActionType.Contract, c)))
}

export function getTotalOpSuccesses(ns: NS): number {
  return sum(Object.values(Operation).map((o) => ns.bladeburner.getActionSuccesses(ActionType.Operation, o)))
}

function getNextBlackOp(ns: NS): BlackOp | undefined {
  return Object.values(BlackOp).find(
    (b) =>
      ns.bladeburner.getActionCountRemaining(ActionType.BlackOp, b) > 0 &&
      ns.bladeburner.getBlackOpRank(b) <= ns.bladeburner.getRank(),
  )
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

function getBestAction(ns: NS, state: PerformActionState): BladeburnerCityAction {
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
  if (blackOp && ns.bladeburner.getActionEstimatedSuccessChance(ActionType.BlackOp, blackOp)[0] > 0.99) {
    return newAction(blackOp, city)
  }

  const bestContract = getBestContract(ns)
  const bestOperation = getBestOperation(ns)

  // 3500 seems about how many contracts we do before we can reliably do ops as well
  if (bestOperation && state.lastActionFinished !== ActionType.Operation) {
    return newAction(bestOperation, city)
  }

  if (bestContract) {
    return newAction(bestContract, city)
  }

  const leveledContract = getBestLeveledContract(ns)
  if (!leveledContract) {
    return newAction(GeneralAction.FieldAnalysis, city)
  }

  if (ns.bladeburner.getActionCurrentLevel(ActionType.Contract, leveledContract.contract) !== leveledContract.level) {
    ns.bladeburner.setActionLevel(ActionType.Contract, leveledContract.contract, leveledContract.level)
  }

  return newAction(leveledContract.contract, city)
}

function currentCityPopIsAboveMinimum(ns: NS): boolean {
  return ns.bladeburner.getCityEstimatedPopulation(ns.bladeburner.getCity()) > MIN_CITY_POP
}

interface PerformActionState {
  opsFinished: number
  contractsFinished: number
  lastActionFinished: ActionType.Contract | ActionType.Operation
}

function newState(): PerformActionState {
  return {
    opsFinished: 0,
    contractsFinished: 0,
    lastActionFinished: ActionType.Contract,
  }
}

function updateState(ns: NS, oldState: PerformActionState): PerformActionState {
  const newState: PerformActionState = {
    opsFinished: getTotalOpSuccesses(ns),
    contractsFinished: getTotalContractSuccesses(ns),
    lastActionFinished: oldState.lastActionFinished,
  }

  if (newState.opsFinished > oldState.opsFinished) {
    newState.lastActionFinished = ActionType.Operation
  }

  if (newState.contractsFinished > oldState.contractsFinished) {
    newState.lastActionFinished = ActionType.Contract
  }

  return newState
}

export default class BladeburnerPerformAction extends BaseAction {
  state: PerformActionState

  constructor() {
    super()

    this.state = newState()
  }

  shouldPerform(_ns: NS): boolean {
    return true
  }

  isPerforming(ns: NS): boolean {
    getBestLeveledContract(ns)

    this.state = updateState(ns, this.state)
    return cityActionIsEqual(getCurrentAction(ns), getBestAction(ns, this.state))
  }

  async perform(ns: NS): Promise<boolean> {
    const action = getBestAction(ns, this.state)

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
