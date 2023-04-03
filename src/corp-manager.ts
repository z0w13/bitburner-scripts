import type { CorpIndustryName, CorporationInfo, NS } from "@ns"
import { CORP_MAIN_CITY, DAEMON_SERVER } from "@/config"
import { SCRIPT_DIVISION_MANAGER } from "@/constants"
import renderTable from "@/lib/func/render-table"
import { formatMoney, formatTime } from "@/lib/util"

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

function printDivisionInfo(ns: NS, corp: CorporationInfo): void {
  for (const divisionName of corp.divisions) {
    const division = ns.corporation.getDivision(divisionName)
    const revenue = Math.max(division.lastCycleRevenue, division.thisCycleRevenue)
    const expenses = Math.max(division.lastCycleExpenses, division.thisCycleExpenses)
    const devProgress =
      division.products.length > 0
        ? ns.corporation.getProduct(division.name, division.products.at(-1) as string).developmentProgress
        : 0

    ns.printf(
      "%s | Revenue: %s | Expenses: %s | Profit: %s | Products: %d | Develop: %s%%",
      division.name,
      formatMoney(ns, revenue),
      formatMoney(ns, expenses),
      formatMoney(ns, revenue - expenses),
      division.products.length,
      ns.formatNumber(devProgress, 2),
    )

    ns.getScriptLogs(SCRIPT_DIVISION_MANAGER, DAEMON_SERVER, ...getDivisionManagerArgs(division.name, division.type))
      .slice(-5)
      .forEach((line) => ns.print(line))
  }
}

function getDivisionManagerArgs(name: string, type: CorpIndustryName): Array<string> {
  return ["--industry", type, "--division", name]
}

function isDivisionMangerRunning(ns: NS, name: string, type: CorpIndustryName): boolean {
  return ns.isRunning(SCRIPT_DIVISION_MANAGER, DAEMON_SERVER, ...getDivisionManagerArgs(name, type))
}

function ensureDivisionManagerRunning(ns: NS, name: string, type: CorpIndustryName): void {
  if (!isDivisionMangerRunning(ns, name, type)) {
    ns.exec(SCRIPT_DIVISION_MANAGER, DAEMON_SERVER, 1, ...getDivisionManagerArgs(name, type))
  }
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")

  if (!ns.corporation.hasCorporation()) {
    ns.tprint("Exited, player does not own a corp.")
    return
  }

  while (true) {
    const corp = ns.corporation.getCorporation()

    if (corp.divisions.length === 0) {
      ensureDivisionManagerRunning(ns, "ZSmonks", "Tobacco")
    }

    unlockUpgrade(ns, "Office API")
    unlockUpgrade(ns, "Warehouse API")
    unlockUpgrade(ns, "Smart Supply")

    // Launch (unstarted) division managers
    for (const divisionName of corp.divisions) {
      const division = ns.corporation.getDivision(divisionName)
      ensureDivisionManagerRunning(ns, division.name, division.type)
    }

    if (corp.divisions.length >= 1 && ns.corporation.getOffice(corp.divisions[0], CORP_MAIN_CITY).size >= 15) {
      manageUpgrades(ns)
    }

    ns.clearLog()
    ns.print(
      renderTable(
        [
          ["Funds", formatMoney(ns, corp.funds)],
          ["Revenue", formatMoney(ns, corp.revenue)],
          ["Expenses", formatMoney(ns, corp.expenses)],
          ["Profit", formatMoney(ns, corp.revenue - corp.expenses)],
          ["Bonus Time", formatTime(ns.corporation.getBonusTime())],
        ],
        false,
      ),
    )
    printDivisionInfo(ns, corp)
    await ns.asleep(1000)
  }
}
