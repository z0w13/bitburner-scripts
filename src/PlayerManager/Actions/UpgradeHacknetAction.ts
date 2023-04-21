import type { NodeStats, NS } from "@ns"
import { sortFunc } from "@/lib/util"
import BaseAction from "@/PlayerManager/Actions/BaseAction"

type NodeProp = "ram" | "cache" | "cores" | "level"
type NodeUpgradeType = NodeProp | "node"

interface IndexedNodeStats extends NodeStats {
  idx: number
}

export default class UpgradeHacknetAction extends BaseAction {
  private ramOnly: boolean

  constructor(ramOnly = false) {
    super()

    this.ramOnly = ramOnly
  }

  getNodes(ns: NS): Array<IndexedNodeStats> {
    return [...Array(ns.hacknet.numNodes())].map((_val, idx) => {
      return { idx, ...ns.hacknet.getNodeStats(idx) }
    })
  }

  getLowestNodes(ns: NS): Record<NodeProp, number> {
    const nodes = this.getNodes(ns)

    return {
      level: [...nodes].sort(sortFunc((v) => v.level)).at(0)?.idx ?? -1,
      ram: [...nodes].sort(sortFunc((v) => v.ram)).at(0)?.idx ?? -1,
      cores: [...nodes].sort(sortFunc((v) => v.cores)).at(0)?.idx ?? -1,
      cache: [...nodes].sort(sortFunc((v) => v.cache ?? 0)).at(0)?.idx ?? -1,
    }
  }

  getCheapestUpgrade(ns: NS): { type: NodeUpgradeType; idx: number; cost: number } | undefined {
    return Object.values(this.getUpgradeCosts(ns))
      .filter((u) => (this.ramOnly ? u.type === "ram" || u.type === "node" : true))
      .sort(sortFunc((v) => v.cost))
      .at(0)
  }

  getUpgradeCosts(ns: NS): Record<NodeUpgradeType, { type: NodeUpgradeType; idx: number; cost: number }> {
    const lowestNodes = this.getLowestNodes(ns)

    return {
      level: {
        idx: lowestNodes.level,
        type: "level",
        cost: lowestNodes.level > -1 ? ns.hacknet.getLevelUpgradeCost(lowestNodes.level, 1) : Infinity,
      },
      cores: {
        idx: lowestNodes.cores,
        type: "cores",
        cost: lowestNodes.cores > -1 ? ns.hacknet.getCoreUpgradeCost(lowestNodes.cores, 1) : Infinity,
      },
      ram: {
        idx: lowestNodes.ram,
        type: "ram",
        cost: lowestNodes.ram > -1 ? ns.hacknet.getRamUpgradeCost(lowestNodes.ram, 1) : Infinity,
      },
      cache: {
        idx: lowestNodes.cache,
        type: "cache",
        cost: lowestNodes.cache > -1 ? ns.hacknet.getCacheUpgradeCost(lowestNodes.cache, 1) : Infinity,
      },
      node: {
        idx: -1,
        type: "node",
        cost: ns.hacknet.getPurchaseNodeCost(),
      },
    }
  }

  shouldPerform(ns: NS): boolean {
    const cheapestUpgrade = this.getCheapestUpgrade(ns)
    return !!cheapestUpgrade && cheapestUpgrade.cost < ns.getPlayer().money
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
    const cheapestUpgrade = this.getCheapestUpgrade(ns)
    if (!cheapestUpgrade) {
      return false
    }

    if (cheapestUpgrade.cost > ns.getPlayer().money) {
      return false
    }

    switch (cheapestUpgrade.type) {
      case "level":
        return ns.hacknet.upgradeLevel(cheapestUpgrade.idx, 1)
      case "cache":
        return ns.hacknet.upgradeCache(cheapestUpgrade.idx, 1)
      case "ram":
        return ns.hacknet.upgradeRam(cheapestUpgrade.idx, 1)
      case "cores":
        return ns.hacknet.upgradeCore(cheapestUpgrade.idx, 1)
      case "node":
        return ns.hacknet.purchaseNode() > -1
    }
  }

  isBackground(): boolean {
    return true
  }
}
