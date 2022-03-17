import { NS } from "@ns"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class UpgradeHacknetAction extends BaseAction {
  getLowestLevelNode(ns: NS): number {
    const nodes = ns.hacknet.numNodes()
    if (nodes === 0) {
      return -1
    }

    let lowestLevel = Infinity
    let lowestIndex = -1
    for (let i = 0; i < nodes; i++) {
      const level = ns.hacknet.getNodeStats(i).level
      if (lowestLevel > level) {
        lowestLevel = level
        lowestIndex = i
      }
    }

    return lowestIndex
  }
  getLowestRamNode(ns: NS): number {
    const nodes = ns.hacknet.numNodes()
    if (nodes === 0) {
      return -1
    }

    let lowestRam = Infinity
    let lowestIndex = -1
    for (let i = 0; i < nodes; i++) {
      const ram = ns.hacknet.getNodeStats(i).ram
      if (lowestRam > ram) {
        lowestRam = ram
        lowestIndex = i
      }
    }

    return lowestIndex
  }
  getLowestCoreNode(ns: NS): number {
    const nodes = ns.hacknet.numNodes()
    if (nodes === 0) {
      return -1
    }

    let lowestCores = Infinity
    let lowestIndex = -1
    for (let i = 0; i < nodes; i++) {
      const cores = ns.hacknet.getNodeStats(i).cores
      if (lowestCores > cores) {
        lowestCores = cores
        lowestIndex = i
      }
    }

    return lowestIndex
  }

  shouldPerform(ns: NS): boolean {
    const nodeCost = ns.hacknet.getPurchaseNodeCost()
    if (ns.hacknet.numNodes() === 0) {
      return ns.getPlayer().money > nodeCost
    }

    const nodeLevelCost = ns.hacknet.getLevelUpgradeCost(this.getLowestLevelNode(ns), 1)
    const nodeRamCost = ns.hacknet.getRamUpgradeCost(this.getLowestRamNode(ns), 1)
    const nodeCoreCost = ns.hacknet.getCoreUpgradeCost(this.getLowestCoreNode(ns), 1)

    const cheapest = Math.min(nodeCost, nodeLevelCost, nodeRamCost, nodeCoreCost)
    return cheapest < ns.getPlayer().money
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
    const nodeCost = ns.hacknet.getPurchaseNodeCost()
    if (ns.hacknet.numNodes() === 0) {
      return ns.hacknet.purchaseNode() > -1
    }

    const nodeLevelCost = ns.hacknet.getLevelUpgradeCost(this.getLowestLevelNode(ns), 1)
    const nodeRamCost = ns.hacknet.getRamUpgradeCost(this.getLowestRamNode(ns), 1)
    const nodeCoreCost = ns.hacknet.getCoreUpgradeCost(this.getLowestCoreNode(ns), 1)

    const cheapest = Math.min(nodeCost, nodeLevelCost, nodeRamCost, nodeCoreCost)

    if (cheapest > ns.getPlayer().money) {
      return false
    }

    if (nodeCost === cheapest) {
      return ns.hacknet.purchaseNode() > -1
    }

    if (nodeLevelCost === cheapest) {
      return ns.hacknet.upgradeLevel(this.getLowestLevelNode(ns), 1)
    }

    if (nodeRamCost === cheapest) {
      return ns.hacknet.upgradeRam(this.getLowestRamNode(ns), 1)
    }

    if (nodeCoreCost === cheapest) {
      return ns.hacknet.upgradeCore(this.getLowestCoreNode(ns), 1)
    }

    return false
  }

  isBackground(): boolean {
    return true
  }
}
