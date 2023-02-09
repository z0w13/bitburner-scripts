import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import { SCRIPT_AUTOBEST_HWGW, SCRIPT_AUTOBUY, SCRIPT_AUTOSETUP, SCRIPT_BLADEBURNER } from "/constants"
import { GeneralAction } from "/data/Bladeburner"
import { Attribute } from "/lib/objects"
import Script from "/lib/Script"
import TrainAction from "/PlayerManager/Actions/TrainAction"

export async function main(ns: NS): Promise<void> {
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

  if (!ns.bladeburner.inBladeburner()) {
    const agilityTrainAction = new TrainAction(Attribute.AGILITY, 100)
    while (agilityTrainAction.shouldPerform(ns)) {
      if (!agilityTrainAction.isPerforming(ns)) {
        await agilityTrainAction.perform(ns)
      }
      await ns.asleep(1000)
    }

    const strengthTrainAction = new TrainAction(Attribute.STRENGTH, 100)
    while (strengthTrainAction.shouldPerform(ns)) {
      if (!strengthTrainAction.isPerforming(ns)) {
        await strengthTrainAction.perform(ns)
      }
      await ns.asleep(1000)
    }

    const defenseTrainAction = new TrainAction(Attribute.DEFENSE, 100)
    while (defenseTrainAction.shouldPerform(ns)) {
      if (!defenseTrainAction.isPerforming(ns)) {
        await defenseTrainAction.perform(ns)
      }
      await ns.asleep(1000)
    }

    const dexterityTrainAction = new TrainAction(Attribute.DEXTERITY, 100)
    while (dexterityTrainAction.shouldPerform(ns)) {
      if (!dexterityTrainAction.isPerforming(ns)) {
        await dexterityTrainAction.perform(ns)
      }
      await ns.asleep(1000)
    }

    if (!ns.bladeburner.joinBladeburnerDivision()) {
      return
    }

    if (!ns.bladeburner.joinBladeburnerFaction()) {
      return
    }
  }

  const bladeburnerPid = Script.runOrReturnPid(ns, Script.fromFile(ns, SCRIPT_BLADEBURNER), DAEMON_SERVER)
  if (bladeburnerPid === 0) {
    ns.tprint(`Failed to start ${SCRIPT_BLADEBURNER}`)
  }

  ns.tail(hwgwPid)
  ns.tail(bladeburnerPid)

  // Initially configure sleeves for bladeburner
  const totalSleeves = ns.sleeve.getNumSleeves()
  if (totalSleeves === 0) {
    return
  }

  if (totalSleeves >= 1) {
    ns.sleeve.setToBladeburnerAction(0, GeneralAction.FieldAnalysis)
  }

  if (totalSleeves >= 2) {
    ns.sleeve.setToBladeburnerAction(1, GeneralAction.Diplomacy)
  }

  // Remainder will generate contracts/ops
  for (let i = 2; i < totalSleeves; i++) {
    ns.sleeve.setToBladeburnerAction(i, "Infiltrate synthoids")
  }
}
