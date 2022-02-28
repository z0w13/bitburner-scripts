import { NS, Division, CorporationInfo, EmployeeJobs, Warehouse, Product } from "@ns"
import renderTable from "/lib/func/render-table"
import setupPolyfill from "/lib/ns-polyfill"
import { sortFunc, sum } from "/lib/util"

// From https://github.com/danielyxie/bitburner/blob/cb6dfd1656a7483b7098d160f1401ee2ae925425/src/Corporation/MaterialSizes.ts
export const MaterialSizes: Record<string, number> = {
  Water: 0.05,
  Energy: 0.01,
  Food: 0.03,
  Plants: 0.05,
  Metal: 0.1,
  Hardware: 0.06,
  Chemicals: 0.05,
  Drugs: 0.02,
  Robots: 0.5,
  AICores: 0.1,
  RealEstate: 0.005,
  "Real Estate": 0.005,
  "AI Cores": 0.1,
}

// Constants
const MULTIPLIER_MATERIALS = ["Robots", "Hardware", "AI Cores", "Real Estate"]

// Config
const MAX_MULTIPLIER = 100
const MAIN_CITY = "Aevum"
const MANAGE_DIVISIONS = ["Smokes", "Helf", "iRobot"]

function buyMaterials(ns: NS, corp: CorporationInfo): void {
  for (const division of corp.divisions) {
    if (MANAGE_DIVISIONS.indexOf(division.name) === -1) {
      continue
    }

    for (const city of division.cities) {
      const warehouseSize = ns.corporation.getWarehouse(division.name, city).size
      const sizePerMaterial = Math.floor((warehouseSize * 0.8) / 4)

      for (const material of MULTIPLIER_MATERIALS) {
        const qty = ns.corporation.getMaterial(division.name, city, material).qty
        const weight = qty * MaterialSizes[material]

        if (weight < sizePerMaterial) {
          const sizePerSec = (sizePerMaterial - weight) / 10
          const toBuyPerSec = sizePerSec / MaterialSizes[material]

          ns.corporation.buyMaterial(division.name, city, material, toBuyPerSec)
          ns.corporation.sellMaterial(division.name, city, material, "0", "")
        } else if (weight > sizePerMaterial + 40) {
          const sizePerSec = (weight - sizePerMaterial) / 10
          const toSellPerSec = sizePerSec / MaterialSizes[material]

          ns.corporation.buyMaterial(division.name, city, material, 0)
          ns.corporation.sellMaterial(division.name, city, material, toSellPerSec.toString(), "MP*0.8")
        } else {
          ns.corporation.buyMaterial(division.name, city, material, 0)
          ns.corporation.sellMaterial(division.name, city, material, "0", "")
        }
      }
    }
  }
}

function developAndDiscontinue(ns: NS, ticks: number): void {
  const corp = ns.corporation.getCorporation()
  for (const division of corp.divisions) {
    if (MANAGE_DIVISIONS.indexOf(division.name) === -1) {
      continue
    }

    const isDeveloping =
      division.products
        .map((p) => ns.corporation.getProduct(division.name, p))
        .filter((p) => p.developmentProgress < 100).length > 0

    if (!isDeveloping) {
      const prodName = division.name + ticks + Math.round(Math.random() * 100)
      ns.corporation.makeProduct(division.name, MAIN_CITY, prodName, 0, 0)
      ns.print(`${division.name} developing ${prodName}`)
    }

    if (division.products.length > 3) {
      // TODO(zowie): not sure how to figure out quality, for now just remove oldest product
      //const lowestQual = division.products
      //  .map((p) => ns.corporation.getMaterial(division.name, MAIN_CITY, p))
      //  .sort(sortFunc((m) => m.qlt))[0]
      const lowestQual = division.products[0]
      ns.corporation.discontinueProduct(division.name, lowestQual)
      ns.print(`${division.name} discontinued ${lowestQual}`)
    }
  }
}

function parseMultiplier(multi: string): number {
  if (!multi.startsWith("MP*")) {
    return 1.0
  }

  const multiNum = parseFloat(multi.split("*").at(-1) ?? "1.0")
  const roundedMultiNum = Math.round(multiNum * 100) / 100

  return roundedMultiNum
}

function getProducts(ns: NS, division: string): Array<Product> {
  return ns.corporation.getDivision(division).products.map((p) => ns.corporation.getProduct(division, p))
}

const stockHistory: Record<string, Array<number>> = {}

function adjustPrices(ns: NS): void {
  const corp = ns.corporation.getCorporation()

  for (const division of corp.divisions) {
    if (MANAGE_DIVISIONS.indexOf(division.name) === -1) {
      continue
    }

    if (ns.corporation.hasResearched(division.name, "Market-TA.II")) {
      for (const productName of division.products) {
        ns.corporation.sellProduct(division.name, MAIN_CITY, productName, "MAX", "MP", true)
        ns.corporation.setProductMarketTA2(division.name, productName, true)
      }

      continue
    }

    const oldestProduct = getProducts(ns, division.name)[0]

    for (const productName of division.products) {
      const product = ns.corporation.getProduct(division.name, productName)
      const [qty] = product.cityData[MAIN_CITY]
      const currMulti = parseMultiplier(product.sCost.toString())

      if (product.developmentProgress < 100) {
        ns.corporation.sellProduct(division.name, MAIN_CITY, productName, "MAX", "MP*1.0", true)
        continue
      }

      const histKey = `${division.name}-${productName}`
      if (!(histKey in stockHistory)) {
        stockHistory[histKey] = []
      }

      stockHistory[histKey].push(qty)

      while (stockHistory[histKey].length > 5) {
        stockHistory[histKey].shift()
      }

      if (stockHistory[histKey].length < 5) {
        continue
      }

      let newMulti =
        Math.round(currMulti) === 1 ? parseMultiplier(oldestProduct.cityData[MAIN_CITY][0].toString()) : currMulti

      if (Math.min(...stockHistory[histKey]) > 0 && currMulti >= 1.1) {
        newMulti = currMulti - 0.1
      } else if (currMulti < MAX_MULTIPLIER) {
        newMulti = currMulti + 0.05
      } else if (currMulti > MAX_MULTIPLIER) {
        newMulti = MAX_MULTIPLIER
      }

      if (newMulti !== currMulti) {
        const symbol = newMulti > currMulti ? "+" : "-"
        const newMultiStr = "MP*" + ns.nFormat(newMulti, "0.00")
        ns.print(
          `Adjusting ${division.name}/${productName} to sell at ${newMultiStr} (${symbol}${ns.nFormat(
            Math.abs(newMulti - currMulti),
            "0.00",
          )})`,
        )
        ns.corporation.sellProduct(division.name, MAIN_CITY, productName, "MAX", newMultiStr, true)
      }
    }
  }
}

function buyResearch(ns: NS) {
  const corp = ns.corporation.getCorporation()

  for (const division of corp.divisions) {
    if (division.research > 10_000 && !ns.corporation.hasResearched(division.name, "Hi-Tech R&D Laboratory")) {
      ns.corporation.research(division.name, "Hi-Tech R&D Laboratory")
    }

    if (division.research > 140_000 && !ns.corporation.hasResearched(division.name, "Market-TA.II")) {
      ns.corporation.research(division.name, "Market-TA.II")
    }
  }
}

function upgradeOffice(ns: NS, division: string, city: string, limit: number): void {
  const office = ns.corporation.getOffice(division, city)
  if (office.size < limit) {
    const upgradeSize = Math.min(15, limit - office.size)
    const cost = ns.corporation.getOfficeSizeUpgradeCost(division, city, upgradeSize)

    //ns.print(
    //  `${division}/${city} Size: ${office.size} upgrade to ${
    //    office.size + upgradeSize
    //  } (+${upgradeSize}) cost ${ns.nFormat(cost, "$0,0.00a")}`,
    //)

    if (cost < ns.corporation.getCorporation().funds / 2) {
      ns.corporation.upgradeOfficeSize(division, city, upgradeSize)
      ns.print(
        `${division}/${city} expanded office to ${office.size + upgradeSize} for ${ns.nFormat(cost, "$0,0.00a")}`,
      )
    }
  }

  while (ns.corporation.getOffice(division, city).employees.length < ns.corporation.getOffice(division, city).size) {
    ns.corporation.hireEmployee(division, city)
  }
}

async function manageOffices(ns: NS, division: Division): Promise<void> {
  const aevumSize = ns.corporation.getOffice(division.name, MAIN_CITY).size
  for (const city of division.cities) {
    if (city === MAIN_CITY) {
      upgradeOffice(ns, division.name, city, aevumSize + 15)
    } else {
      upgradeOffice(ns, division.name, city, aevumSize - 60)
    }
    await redistributeEmployees(ns, division.name, city)
  }
}

async function redistributeEmployees(ns: NS, division: string, city: string): Promise<void> {
  const ratio: Record<keyof EmployeeJobs, number> = {
    Business: 0.166,
    Engineer: 0.066,
    Management: 0.25,
    Operations: 0.35,
    "Research & Development": 0.166,
    Training: 0,
    Unassigned: 0,
  }

  const employeeJobs = getEmployeeJobs(ns, division, city)

  if (sum(Object.values(employeeJobs)) - employeeJobs.Unassigned < ns.corporation.getOffice(division, city).size) {
    for (const pos of Object.keys(ratio)) {
      await ns.corporation.setAutoJobAssignment(division, city, pos, 0)
    }

    for (const [pos, posRatio] of Object.entries(ratio)) {
      await ns.corporation.setAutoJobAssignment(
        division,
        city,
        pos,
        Math.floor(posRatio * ns.corporation.getOffice(division, city).size),
      )
    }

    for (const employee of ns.corporation.getOffice(division, city).employees) {
      if (ns.corporation.getEmployee(division, city, employee).pos === "Unassigned") {
        await ns.corporation.assignJob(division, city, employee, "Research & Development")
      }
    }

    const newEmployeeJobs = getEmployeeJobs(ns, division, city)
    ns.print(`${division}/${city} reassigned employees `, newEmployeeJobs)
  }
}

function getEmployeeJobs(ns: NS, division: string, city: string): EmployeeJobs {
  const employeeJobs: EmployeeJobs = {
    Business: 0,
    Engineer: 0,
    Management: 0,
    Operations: 0,
    "Research & Development": 0,
    Training: 0,
    Unassigned: 0,
  }

  for (const employee of ns.corporation.getOffice(division, city).employees) {
    const pos = ns.corporation.getEmployee(division, city, employee).pos as keyof EmployeeJobs
    employeeJobs[pos]++
  }

  return employeeJobs
}

function getWarehouses(ns: NS, division: string): Array<Warehouse> {
  return ns.corporation.getDivision(division).cities.map((c) => ns.corporation.getWarehouse(division, c))
}

function manageWarehouses(ns: NS, division: Division): void {
  const smallestWarehouse = getWarehouses(ns, division.name).sort(sortFunc((w) => w.size))[0]
  const city = smallestWarehouse.loc

  if (smallestWarehouse.size > 15_000 && ns.corporation.getCorporation().funds < 1_000_000_000_000) {
    return
  }

  while (true) {
    const cost = ns.corporation.getUpgradeWarehouseCost(division.name, city)
    if (cost < ns.corporation.getCorporation().funds / 2) {
      ns.corporation.upgradeWarehouse(division.name, city)
      ns.print(
        `${division.name}/${city} expanded warehouse to ${ns.nFormat(
          ns.corporation.getWarehouse(division.name, city).size,
          "0,0",
        )} for ${ns.nFormat(cost, "$0.00a")}`,
      )
    } else {
      break
    }
  }
}

function manageAdVert(ns: NS, division: string): void {
  const corp = ns.corporation.getCorporation()
  if (ns.corporation.getHireAdVertCost(division) < corp.funds / 2) {
    const adCost = ns.corporation.getHireAdVertCost(division)
    ns.corporation.hireAdVert(division)
    ns.print(`${division} hired AdVert for ${ns.nFormat(adCost, "$0.00a")}`)
  }
}

function buyUpgradesToLevel(ns: NS, max: number, upgrades: Array<string>): void {
  for (const upgrade of upgrades) {
    const funds = ns.corporation.getCorporation().funds
    const cost = ns.corporation.getUpgradeLevelCost(upgrade)
    const level = ns.corporation.getUpgradeLevel(upgrade)
    if (cost < funds / 2 && level < max) {
      ns.corporation.levelUpgrade(upgrade)
      ns.print(`Upgraded ${upgrade} to lvl ${level + 1} for ${ns.nFormat(cost, "$0,0.00a")}`)
    }
  }
}

function manageUpgrades(ns: NS): void {
  buyUpgradesToLevel(ns, 10, ["Smart Factories", "Smart Storage"])

  buyUpgradesToLevel(ns, 20, [
    "Neural Accelerators",
    "FocusWires",
    "Nuoptimal Nootropic Injector Implants",
    "Speech Processor Implants",
  ])

  buyUpgradesToLevel(ns, 30, ["Project Insight"])
  buyUpgradesToLevel(ns, 1000, ["Wilson Analytics"])
}

async function officeManager(ns: NS): Promise<void> {
  while (true) {
    for (const division of MANAGE_DIVISIONS) {
      ns.print("======================= Manage Offices =========================")
      await manageOffices(ns, ns.corporation.getDivision(division))
      await ns.asleep(1000)
    }
  }
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("asleep")
  let ticks = 0

  void officeManager(ns)

  while (true) {
    const corp = ns.corporation.getCorporation()
    ns.print("======================= Manage Materials =======================")
    buyMaterials(ns, corp)

    if (ticks % 10 === 0) {
      ns.print("======================== Adjust Prices =========================")
      const tableData = Object.entries(stockHistory).map(([prod, val]) => [prod, ...val])
      if (tableData.length > 0) {
        ns.print(renderTable(ns, tableData, false))
      }

      adjustPrices(ns)
    }

    if (ticks % 60 === 0) {
      ns.print("======================= Manage Upgrades ========================")
      manageUpgrades(ns)

      ns.print("======================= Manage Products ========================")
      if (corp.funds > 0) {
        developAndDiscontinue(ns, ticks)
      }

      ns.print("======================= Manage Research ========================")
      buyResearch(ns)

      for (const division of MANAGE_DIVISIONS) {
        ns.print("======================= Manage Adverts =========================")
        manageAdVert(ns, division)

        ns.print("====================== Manage Warehouses =======================")
        manageWarehouses(ns, ns.corporation.getDivision(division))
      }
    }

    await ns.asleep(1000)
    ticks++
  }
}
