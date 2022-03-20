import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import BaseAction from "/PlayerManager/Actions/BaseAction"

enum UpgradeType {
  TOR,
  PROGRAM,
  HOME_RAM,
}

interface Upgrade {
  name: string
  price: number
  type: UpgradeType
}

export default class BuyUpgradesAction extends BaseAction {
  UPGRADE_LIST: Array<Upgrade> = [
    { name: "TOR", price: 200_000, type: UpgradeType.TOR },

    { name: "BruteSSH.exe", price: 500_000, type: UpgradeType.PROGRAM },
    { name: "FTPCrack.exe", price: 1_500_000, type: UpgradeType.PROGRAM },
    { name: "relaySMTP.exe", price: 5_000_000, type: UpgradeType.PROGRAM },
    { name: "HTTPWorm.exe", price: 30_000_000, type: UpgradeType.PROGRAM },
    { name: "SQLInject.exe", price: 250_000_000, type: UpgradeType.PROGRAM },

    { name: "DeepscanV1.exe", price: 500_000, type: UpgradeType.PROGRAM },
    { name: "DeepscanV2.exe", price: 25_000_000, type: UpgradeType.PROGRAM },
    { name: "AutoLink.exe", price: 1_000_000, type: UpgradeType.PROGRAM },

    { name: "Formulas.exe", price: 5_000_000_000, type: UpgradeType.PROGRAM },

    { name: "Home RAM", price: -1, type: UpgradeType.HOME_RAM },
  ]

  getAffordableUpgrade(ns: NS): Upgrade | null {
    const player = ns.getPlayer()

    for (const upgrade of this.UPGRADE_LIST) {
      if (player.money < upgrade.price) {
        continue
      }

      switch (upgrade.type) {
        case UpgradeType.TOR:
          if (player.tor) {
            continue
          }

          return upgrade
        case UpgradeType.PROGRAM:
          if (ns.fileExists(upgrade.name, DAEMON_SERVER)) {
            continue
          }
          return upgrade
        case UpgradeType.HOME_RAM:
          if (ns.getUpgradeHomeRamCost() > player.money) {
            continue
          }
          return upgrade
      }
    }

    return null
  }

  shouldPerform(ns: NS): boolean {
    return this.getAffordableUpgrade(ns) !== null
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    const upgrade = this.getAffordableUpgrade(ns)
    if (!upgrade) {
      return false
    }

    switch (upgrade.type) {
      case UpgradeType.TOR:
        return ns.purchaseTor()
      case UpgradeType.PROGRAM:
        return ns.purchaseProgram(upgrade.name)
      case UpgradeType.HOME_RAM:
        return ns.upgradeHomeRam()
    }
  }

  isBackground(): boolean {
    return true
  }
}
