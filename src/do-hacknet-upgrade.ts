import { NS } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"
import UpgradeHacknetAction from "/PlayerManager/Actions/UpgradeHacknetAction"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("asleep")

  const upgrader = new UpgradeHacknetAction()

  while (true) {
    while (ns.hacknet.numHashes() > 4) {
      ns.hacknet.spendHashes("Sell for Money")
    }

    if (upgrader.shouldPerform(ns)) {
      await upgrader.perform(ns)
    }

    await ns.asleep(1000)
  }
}
