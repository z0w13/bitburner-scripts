import { BladeburnerCurAction, NS } from "@ns"
import { ActionType, Contract, GeneralAction, Operation, Skill } from "/data/Bladeburner"

import BaseAction from "/PlayerManager/Actions/BaseAction"

function actionIsEqual(actionA: BladeburnerCurAction, actionB: BladeburnerCurAction): boolean {
  return (
    actionA.type.toLowerCase() === actionB.type.toLowerCase() &&
    actionA.name.toLowerCase() === actionB.name.toLowerCase()
  )
}

function getStaminaPct(curr: number, max: number): number {
  return curr / max
}

export function getBestContract(ns: NS, contractNames: Array<Contract>): Contract | undefined {
  return contractNames
    .filter((c) => ns.bladeburner.getActionCountRemaining(ActionType.Contract, c) > 100)
    .filter((c) => ns.bladeburner.getActionEstimatedSuccessChance(ActionType.Contract, c)[0] > 0.5)
    .at(-1)
}

function getBestOperation(ns: NS, operationNames: Array<Operation>): Operation | undefined {
  return operationNames
    .filter((op) => ns.bladeburner.getActionCountRemaining(ActionType.Operation, op) > 100)
    .filter((op) => ns.bladeburner.getActionEstimatedSuccessChance(ActionType.Operation, op)[0] > 0.5)
    .at(-1)
}

export function getMoneyBeforeOps(ns: NS, contract: Contract = Contract.Retirement): number {
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
  const contractsBeforeMet = 20 // How many contracts we want it to take to reach our goal
  const moneyMult = 1 + midasLevel * 0.1

  // Adapted from https://github.com/danielyxie/bitburner/blob/68e90b8e6eddd68a6ebf1406b527131056aa7015/src/Bladeburner/Bladeburner.tsx#L1263
  const rewardMultiplier = Math.pow(rewardFac, contractLevel - 1)
  const moneyGain = baseMoneyGain * rewardMultiplier * moneyMult

  return moneyGain * contractsBeforeMet
}

function getBestAction(ns: NS): { type: ActionType; name: string } {
  const currentAction = ns.bladeburner.getCurrentAction()

  if (currentAction.type == ActionType.BlackOp) {
    return { type: currentAction.type, name: currentAction.name }
  }

  const staminaPct = getStaminaPct(...ns.bladeburner.getStamina())
  if (
    actionIsEqual(currentAction, { type: ActionType.General, name: GeneralAction.FieldAnalysis }) &&
    staminaPct < 0.9
  ) {
    return { type: ActionType.General, name: GeneralAction.FieldAnalysis }
  }

  if (staminaPct < 0.5) {
    return { type: ActionType.General, name: GeneralAction.FieldAnalysis }
  }

  const bestContract = getBestContract(ns, ns.bladeburner.getContractNames() as Array<Contract>)
  if (ns.getPlayer().money > getMoneyBeforeOps(ns, bestContract)) {
    const bestOperation = getBestOperation(ns, ns.bladeburner.getOperationNames() as Array<Operation>)
    if (bestOperation) {
      return { type: ActionType.Operation, name: bestOperation }
    }
  }

  if (!bestContract) {
    return { type: ActionType.General, name: GeneralAction.FieldAnalysis }
  }

  return { type: ActionType.Contract, name: bestContract }
}

export default class BladeburnerAction extends BaseAction {
  shouldPerform(_ns: NS): boolean {
    return true
  }

  isPerforming(ns: NS): boolean {
    if (this.isBackground(ns)) {
      return false
    }

    return actionIsEqual(ns.bladeburner.getCurrentAction(), getBestAction(ns))
  }

  async perform(ns: NS): Promise<boolean> {
    const action = getBestAction(ns)
    return ns.bladeburner.startAction(action.type, action.name)
  }

  isBackground(ns: NS): boolean {
    return ns.singularity.getOwnedAugmentations().includes("The Blade's Simulacrum")
  }
}
