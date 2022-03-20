import { NS } from "@ns"
import { LOG_LEVEL } from "/config"
import getPlayerAction from "/lib/func/get-player-action"
import setupPolyfill from "/lib/ns-polyfill"
import { LogLevel } from "/lib/objects"
import { ActionResolver } from "/PlayerManager/Actions"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")
  ns.enableLog("joinFaction")
  ns.enableLog("corporation.createCorporation")
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

  const actionResolver = new ActionResolver(globalThis.__globalState.playerSettings)

  while (true) {
    await ns.asleep(2000)

    const desiredAction = actionResolver.resolve(ns)

    if (!desiredAction.isPerforming(ns)) {
      if (!desiredAction.isBackground()) {
        ns.stopAction()
      }
      await desiredAction.perform(ns)
    }

    if (LOG_LEVEL >= LogLevel.Debug) {
      ns.print(getPlayerAction(ns))
    }
  }
}
