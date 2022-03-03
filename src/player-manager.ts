import { NS } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"
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

  const actionResolver = new ActionResolver()

  ns.tail(ns.getRunningScript().pid)

  while (true) {
    await ns.asleep(2000)

    const desiredAction = actionResolver.resolve(ns)

    if (!desiredAction.isPerforming(ns)) {
      if (!desiredAction.isBackground()) {
        ns.stopAction()
      }
      desiredAction.perform(ns)
    }

    //ns.print(
    //  `${ns.getPlayer().workType} ${ns.getPlayer().crimeType} ${ns.getPlayer().location} ${ns.getPlayer().className} ${
    //    ns.getPlayer().isWorking
    //  } ${ns.getPlayer().companyName}`,
    //)
  }
}
