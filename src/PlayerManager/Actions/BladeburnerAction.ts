import { BladeburnerCurAction, NS } from "@ns"
import { ActionType, GeneralAction, Skill } from "/data/Bladeburner"

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

function getBestContract(ns: NS, contractNames: Array<string>): string | undefined {
  return contractNames
    .filter((c) => ns.bladeburner.getActionCountRemaining(ActionType.Contract, c) > 100)
    .filter((c) => ns.bladeburner.getActionEstimatedSuccessChance(ActionType.Contract, c)[0] > 0.5)
    .at(-1)
}

function getBestOperation(ns: NS, operationNames: Array<string>): string | undefined {
  return operationNames
    .filter((op) => ns.bladeburner.getActionCountRemaining(ActionType.Operation, op) > 100)
    .filter((op) => ns.bladeburner.getActionEstimatedSuccessChance(ActionType.Operation, op)[0] > 0.5)
    .at(-1)
}

export function getMoneyBeforeOps(ns: NS): number {
  return 500_000 * 10 * Math.pow(1.1, ns.bladeburner.getSkillLevel(Skill.HandsofMidas))
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

  const bestContract = getBestContract(ns, ns.bladeburner.getContractNames())
  if (ns.getPlayer().money > getMoneyBeforeOps(ns)) {
    const bestOperation = getBestOperation(ns, ns.bladeburner.getOperationNames())
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
