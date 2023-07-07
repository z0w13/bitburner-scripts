import { getAugmentPurchaseInfo } from "@/data/Augments"
import { NS } from "@ns"

export async function main(ns: NS): Promise<void> {
  const name = ns.args[0]

  const augs = getAugmentPurchaseInfo(ns)
  const matching = augs.filter((a) => a.name.toLowerCase().includes(name.toString().toLowerCase()))

  for (const match of matching) {
    ns.tprint(`${match.name} from ${match.factions.join(", ")}`)
  }
}
