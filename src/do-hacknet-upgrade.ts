import type { NS } from "@ns"
import UpgradeHacknetAction from "@/PlayerManager/Actions/UpgradeHacknetAction"
import parseFlags from "@/lib/parseFlags"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")

  const flags = parseFlags(ns, { ramOnly: false })
  const upgrader = new UpgradeHacknetAction(flags.ramOnly)

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
