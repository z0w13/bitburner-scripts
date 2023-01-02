import { NS } from "@ns"
import { LOG_LEVEL } from "/config"
import getPlayerAction from "/lib/func/get-player-action"
import { getGlobalState } from "/lib/shared/GlobalStateManager"
import { FlagSchema, LogLevel } from "/lib/objects"
import { PlayerManager } from "/PlayerManager/PlayerManager"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"

const flagSchema: FlagSchema = [
  ["focusHacking", false],
  ["passiveOnly", false],
  ["enableHacknet", false],
]

interface Flags {
  focusHacking: boolean
  passiveOnly: boolean
  enableHacknet: boolean
}

export async function main(ns: NS): Promise<void> {
  const flags = ns.flags(flagSchema) as Flags & ScriptArgs
  const playerSettings = getGlobalState().playerSettings

  playerSettings.enableHacknet = flags.enableHacknet
  playerSettings.focusHacking = flags.focusHacking
  playerSettings.passiveOnly = flags.passiveOnly

  ns.disableLog("ALL")
  ns.enableLog("singularity.joinFaction")
  //ns.enableLog("corporation.createCorporation")
  ns.enableLog("gang.createGang")
  //ns.enableLog("commitCrime")
  ns.enableLog("singularity.purchaseAugmentation")
  ns.enableLog("singularity.purchaseTor")
  ns.enableLog("singularity.purchaseProgram")
  ns.enableLog("singularity.upgradeHomeRam")
  //ns.enableLog("singularity.workForFaction")
  ns.enableLog("singularity.installAugmentations")
  ns.enableLog("singularity.universityCourse")
  ns.enableLog("singularity.gymWorkout")
  ns.enableLog("singularity.workForCompany")
  ns.enableLog("singularity.applyToCompany")

  const playerMgr = new PlayerManager(ns, getGlobalState().playerSettings)

  while (true) {
    await ns.asleep(2000)
    await playerMgr.run(ns)

    if (LOG_LEVEL >= LogLevel.Debug) {
      ns.print(getPlayerAction(ns))
    }
  }
}
