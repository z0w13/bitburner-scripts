import { NS } from "@ns"
import { LOG_LEVEL } from "/config"
import getPlayerAction from "/lib/func/get-player-action"
import { getGlobalState } from "/lib/shared/GlobalStateManager"
import setupPolyfill from "/lib/ns-polyfill"
import { LogLevel } from "/lib/objects"
import { PlayerManager } from "/PlayerManager/PlayerManager"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")
  ns.enableLog("joinFaction")
  //ns.enableLog("corporation.createCorporation")
  ns.enableLog("gang.createGang")
  //ns.enableLog("commitCrime")
  ns.enableLog("purchaseAugmentation")
  ns.enableLog("purchaseTor")
  ns.enableLog("purchaseProgram")
  ns.enableLog("upgradeHomeRam")
  ns.enableLog("workForFaction")
  ns.enableLog("installAugmentations")
  ns.enableLog("universityCourse")
  ns.enableLog("gymWorkout")
  ns.enableLog("workForCompany")
  ns.enableLog("applyToCompany")

  const playerMgr = new PlayerManager(getGlobalState().playerSettings)

  while (true) {
    await ns.asleep(2000)
    await playerMgr.run(ns)

    if (LOG_LEVEL >= LogLevel.Debug) {
      ns.print(getPlayerAction(ns))
    }
  }
}
