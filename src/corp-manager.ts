import { NS } from "@ns"
import { CORP_MAIN_CITY, DAEMON_SERVER } from "/config"
import renderTable, { RawTableData } from "/lib/func/render-table"
import { formatMoney } from "/lib/util"

function buyUpgradesToLevel(ns: NS, max: number, upgrades: Array<string>): void {
  for (const upgrade of upgrades) {
    while (
      ns.corporation.getUpgradeLevelCost(upgrade) < ns.corporation.getCorporation().funds / 2 &&
      ns.corporation.getUpgradeLevel(upgrade) < max
    ) {
      const cost = ns.corporation.getUpgradeLevelCost(upgrade)

      ns.corporation.levelUpgrade(upgrade)
      ns.print(`Upgraded ${upgrade} to lvl ${ns.corporation.getUpgradeLevel(upgrade) + 1} for ${formatMoney(ns, cost)}`)
    }
  }
}

function unlockUpgrade(ns: NS, name: string): void {
  const funds = ns.corporation.getCorporation().funds

  if (ns.corporation.getUnlockUpgradeCost(name) < funds && !ns.corporation.hasUnlockUpgrade(name)) {
    ns.corporation.unlockUpgrade(name)
  }
}

function manageUpgrades(ns: NS): void {
  unlockUpgrade(ns, "VeChain")
  unlockUpgrade(ns, "Shady Accounting")
  unlockUpgrade(ns, "Government Partnership")

  buyUpgradesToLevel(ns, 10, ["Smart Factories", "Smart Storage"])

  buyUpgradesToLevel(ns, 20, [
    "Neural Accelerators",
    "FocusWires",
    "Nuoptimal Nootropic Injector Implants",
    "Speech Processor Implants",
  ])

  buyUpgradesToLevel(ns, 100, ["Wilson Analytics"])

  buyUpgradesToLevel(ns, 500, [
    "Smart Factories",
    "Smart Storage",
    "Neural Accelerators",
    "FocusWires",
    "Nuoptimal Nootropic Injector Implants",
    "Speech Processor Implants",
    "Project Insight",
    "DreamSense",
    "ABC SalesBots",
    "Wilson Analytics",
  ])
  buyUpgradesToLevel(ns, 1000, ["Wilson Analytics"])
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")

  if (!ns.getPlayer().hasCorporation) {
    ns.tprint("Exited, player does not own a corp.")
    return
  }

  while (true) {
    await ns.asleep(1000)

    const corp = ns.corporation.getCorporation()

    unlockUpgrade(ns, "Office API")
    unlockUpgrade(ns, "Warehouse API")
    unlockUpgrade(ns, "Smart Supply")

    for (const division of corp.divisions) {
      const args = ["--industry", division.type, "--division", division.name]
      if (!ns.isRunning("division-manager.js", DAEMON_SERVER, ...args)) {
        ns.exec("division-manager.js", DAEMON_SERVER, 1, ...args)
      }
    }

    if (corp.divisions.length > 1 && ns.corporation.getOffice(corp.divisions[0].name, CORP_MAIN_CITY).size >= 15) {
      manageUpgrades(ns)
    }

    const tableData: RawTableData = [["Division", "Income", "Expense", "Net"]]
    for (const division of corp.divisions) {
      tableData.push([
        division.name,
        formatMoney(ns, division.thisCycleRevenue),
        formatMoney(ns, division.thisCycleExpenses),
        formatMoney(ns, division.thisCycleRevenue - division.thisCycleExpenses),
      ])
    }

    ns.print(renderTable(ns, tableData, true))
  }
}
