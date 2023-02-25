import type { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import { SCRIPT_AUTOBEST_HWGW, SCRIPT_AUTOBUY, SCRIPT_AUTOSETUP, SCRIPT_BLADEBURNER } from "/constants"
import { Attribute } from "/lib/objects"
import Script from "/lib/Script"
import TrainAction from "/PlayerManager/Actions/TrainAction"

async function trainCombat(ns: NS, targetLevel = 100): Promise<void> {
  const agilityTrainAction = new TrainAction(Attribute.AGILITY, targetLevel)
  while (agilityTrainAction.shouldPerform(ns)) {
    if (!agilityTrainAction.isPerforming(ns)) {
      await agilityTrainAction.perform(ns)
    }
    await ns.asleep(1000)
  }

  const strengthTrainAction = new TrainAction(Attribute.STRENGTH, targetLevel)
  while (strengthTrainAction.shouldPerform(ns)) {
    if (!strengthTrainAction.isPerforming(ns)) {
      await strengthTrainAction.perform(ns)
    }
    await ns.asleep(1000)
  }

  const defenseTrainAction = new TrainAction(Attribute.DEFENSE, targetLevel)
  while (defenseTrainAction.shouldPerform(ns)) {
    if (!defenseTrainAction.isPerforming(ns)) {
      await defenseTrainAction.perform(ns)
    }
    await ns.asleep(1000)
  }

  const dexterityTrainAction = new TrainAction(Attribute.DEXTERITY, targetLevel)
  while (dexterityTrainAction.shouldPerform(ns)) {
    if (!dexterityTrainAction.isPerforming(ns)) {
      await dexterityTrainAction.perform(ns)
    }
    await ns.asleep(1000)
  }
}

function startScripts(ns: NS): void {
  if (Script.runOrReturnPid(ns, Script.fromFile(ns, SCRIPT_AUTOSETUP), DAEMON_SERVER) === 0) {
    ns.tprint(`Failed to start ${SCRIPT_AUTOSETUP}`)
  }
  if (Script.runOrReturnPid(ns, Script.fromFile(ns, SCRIPT_AUTOBUY), DAEMON_SERVER) === 0) {
    ns.tprint(`Failed to start ${SCRIPT_AUTOBUY}`)
  }
  const hwgwPid = Script.runOrReturnPid(ns, Script.fromFile(ns, SCRIPT_AUTOBEST_HWGW), DAEMON_SERVER)
  if (hwgwPid === 0) {
    ns.tprint(`Failed to start ${SCRIPT_AUTOBEST_HWGW}`)
  }

  const bladeburnerPid = Script.runOrReturnPid(ns, Script.fromFile(ns, SCRIPT_BLADEBURNER), DAEMON_SERVER)
  if (bladeburnerPid === 0) {
    ns.tprint(`Failed to start ${SCRIPT_BLADEBURNER}`)
  }

  ns.tail(hwgwPid)
  ns.tail(bladeburnerPid)
}

function assignSleeves(ns: NS): void {
  // Initially configure sleeves for bladeburner
  const totalSleeves = ns.sleeve.getNumSleeves()
  if (totalSleeves === 0) {
    return
  }

  if (totalSleeves >= 1) {
    ns.sleeve.setToBladeburnerAction(0, "Field analysis")
  }

  if (totalSleeves >= 2) {
    ns.sleeve.setToBladeburnerAction(1, "Diplomacy")
  }

  // Remainder will generate contracts/ops
  for (let i = 2; i < totalSleeves; i++) {
    ns.sleeve.setToBladeburnerAction(i, "Infiltrate synthoids")
  }
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  await trainCombat(ns, 100)
  ns.bladeburner.joinBladeburnerDivision()
  startScripts(ns)
  assignSleeves(ns)
}
