import { NS } from "@ns"
import { sortFunc } from "/lib/util"
import BaseAction from "/PlayerManager/Actions/BaseAction"

interface HashUpgrade {
  name: string
  cost: number
  target?: string
}

export default class SpendHashesAction extends BaseAction {
  getCheapestUpgrade(ns: NS): HashUpgrade {
    const upgrades: Array<HashUpgrade> = [
      { name: "Increase Maximum Money", cost: ns.hacknet.hashCost("Increase Maximum Money"), target: "megacorp" },
    ]

    if (ns.getServer("megacorp").minDifficulty > 2.1) {
      upgrades.push({
        name: "Reduce Minimum Security",
        cost: ns.hacknet.hashCost("Reduce Minimum Security"),
        target: "megacorp",
      })
    }

    if (ns.getPlayer().hasCorporation) {
      //if (ns.corporation.getCorporation().funds < 50_000_000_000) {
      //  upgrades.push({ name: "Sell for Corporation Funds", cost: ns.hacknet.hashCost("Sell for Corporation Funds") })
      //}

      upgrades.push({
        name: "Exchange for Corporation Research",
        cost: ns.hacknet.hashCost("Exchange for Corporation Research"),
      })
    }

    return upgrades.sort(sortFunc((v) => v.cost))[0]
  }

  shouldPerform(ns: NS): boolean {
    if (ns.getPlayer().money < 10_000_000_000) {
      return ns.hacknet.numHashes() > 4
    }

    return this.getCheapestUpgrade(ns).cost <= ns.hacknet.numHashes()
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    while (this.shouldPerform(ns) && this._perform(ns)) {
      continue
    }

    return true
  }

  _perform(ns: NS): boolean {
    if (ns.getPlayer().money < 10_000_000_000) {
      return ns.hacknet.spendHashes("Sell for Money")
    }

    const upg = this.getCheapestUpgrade(ns)
    return ns.hacknet.spendHashes(upg.name, upg.target)
  }

  isBackground(): boolean {
    return true
  }

  shouldContinue(): boolean {
    return true
  }
}
