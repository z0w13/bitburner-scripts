import { NS } from "@ns"
import getPlayerAction from "/lib/func/get-player-action"
import setupPolyfill from "/lib/ns-polyfill"
import { FlagSchema } from "/lib/objects"
import { ActionResolver } from "/PlayerManager/Actions"

const flagSchema: FlagSchema = [["hack", false]]

interface Flags {
  hack: boolean
}

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

  const flags = ns.flags(flagSchema) as Flags

  const actionResolver = new ActionResolver(flags.hack)

  while (true) {
    await ns.asleep(2000)

    const desiredAction = actionResolver.resolve(ns)

    if (!desiredAction.isPerforming(ns)) {
      if (!desiredAction.isBackground()) {
        ns.stopAction()
      }
      await desiredAction.perform(ns)
    }

    //ns.print(getPlayerAction(ns))
    //ns.print(
    //  `${ns.getPlayer().workType} | ${ns.getPlayer().crimeType} | ${ns.getPlayer().location} | ${
    //    ns.getPlayer().className
    //  } | ${ns.getPlayer().isWorking} | ${ns.getPlayer().companyName} | ${ns.getPlayer().currentWorkFactionName}`,
    //)
  }
}
