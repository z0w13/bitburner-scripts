import { NS, Division, CorporationInfo, EmployeeJobs, Warehouse } from "@ns"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"
import { CORP_MAIN_CITY } from "/config"
import renderTable from "/lib/func/render-table"
import { FlagSchema } from "/lib/objects"
import { formatMoney, formatNum, sortFunc } from "/lib/util"

const flagSchema: FlagSchema = [
  ["division", "ZSmokes"],
  ["industry", "Tobacco"],
]

interface Flags {
  division: string
  industry: string
}

const nonProductMap: Record<string, Array<string>> = {
  Mining: ["Metal"],
  Fishing: ["Food"],
  Energy: ["Energy"],
  Chemical: ["Chemicals"],
  Agriculture: ["Plants", "Food"],
  Utilities: ["Water"],
  Software: ["AI Cores"],
  Pharmaceutical: ["Drugs"],
  Computer: ["Hardware"],
  Robotics: ["Robots"],
}

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

function getProductLimit(ns: NS, division: string): number {
  if (!ns.corporation.hasUnlockUpgrade("Office API")) {
    return 3
  }

  if (ns.corporation.hasResearched(division, "uPgrade: Capacity.II")) {
    return 5
  }

  if (ns.corporation.hasResearched(division, "uPgrade: Capacity.I")) {
    return 4
  }

  return 3
}

function buyMaterials(ns: NS, corp: CorporationInfo, division: Division): void {
  for (const city of division.cities) {
    if (!ns.corporation.hasWarehouse(division.name, city)) {
      continue
    }
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

function developAndDiscontinue(ns: NS, division: Division, ticks: number): void {
  if (ns.corporation.getCorporation().funds < 0) {
    return
  }

  const isDeveloping =
    division.products.map((p) => ns.corporation.getProduct(division.name, p)).filter((p) => p.developmentProgress < 100)
      .length > 0

  if (isDeveloping) {
    ns.print(`${division.name} is currently developing a new product`)
    return
  }

  if (division.products.length >= getProductLimit(ns, division.name)) {
    // TODO(zowie): not sure how to figure out quality, for now just remove oldest product
    //const lowestQual = division.products
    //  .map((p) => ns.corporation.getMaterial(division.name, CORP_MAIN_CITY, p))
    //  .sort(sortFunc((m) => m.qlt))[0]
    const lowestQual = division.products[0]
    ns.corporation.discontinueProduct(division.name, lowestQual)
    ns.print(`${division.name} discontinued ${lowestQual}`)
  }

  const prodName = division.name + ticks + Math.round(Math.random() * 100)
  ns.corporation.makeProduct(division.name, CORP_MAIN_CITY, prodName, 0, 0)
  ns.print(`${division.name} developing ${prodName}`)
}

function parseMultiplier(multi: string): number {
  if (!multi.startsWith("MP*")) {
    return 1.0
  }

  const multiNum = parseFloat(multi.split("*").at(-1) ?? "1.0")
  const roundedMultiNum = Math.round(multiNum * 100) / 100

  return roundedMultiNum
}

const stockHistory: Record<string, Record<string, Array<number>>> = {}

function adjustPrices(ns: NS, division: Division): void {
  const hasOfficeAPI = ns.corporation.hasUnlockUpgrade("Office API")
  const hasTAII = hasOfficeAPI && ns.corporation.hasResearched(division.name, "Market-TA.II")

  // Clear old products
  if (division.name in stockHistory) {
    for (const key of Object.keys(stockHistory[division.name])) {
      const productName = key.split("-").at(-1)
      if (!productName || !division.products.includes(productName)) {
        delete stockHistory[division.name][key]
      }
    }
  }

  if (division.type in nonProductMap) {
    for (const materialName of nonProductMap[division.type]) {
      const mat = ns.corporation.getMaterial(division.name, CORP_MAIN_CITY, materialName)
      const qty = mat.qty

      const price = getNewPrice(ns, division, mat.name, qty, 100, mat.sCost)
      for (const city of division.cities) {
        if (hasTAII) {
          ns.corporation.sellMaterial(division.name, city, mat.name, "MAX", "MP")
          ns.corporation.setMaterialMarketTA2(division.name, city, mat.name, true)
        } else if (price !== mat.sCost) {
          ns.corporation.sellMaterial(division.name, city, mat.name, "MAX", price)
        }
      }
    }
  }

  for (const productName of division.products) {
    const product = ns.corporation.getProduct(division.name, productName)
    const [qty] = product.cityData[CORP_MAIN_CITY]

    const price = getNewPrice(ns, division, product.name, qty, product.developmentProgress, product.sCost)

    if (hasTAII) {
      ns.corporation.sellProduct(division.name, CORP_MAIN_CITY, product.name, "MAX", "MP", true)
      ns.corporation.setProductMarketTA2(division.name, product.name, true)
    } else if (price !== product.sCost) {
      ns.corporation.sellProduct(division.name, CORP_MAIN_CITY, product.name, "MAX", price, true)
    }
  }
}

function getNewPrice(
  ns: NS,
  division: Division,
  name: string,
  qty: number,
  devProgress: number,
  currentPrice: string | number,
): string {
  if (!(division.name in stockHistory)) {
    stockHistory[division.name] = {}
  }
  if (!(name in stockHistory[division.name])) {
    stockHistory[division.name][name] = []
  }
  stockHistory[division.name][name].push(qty)

  while (stockHistory[division.name][name].length > 5) {
    stockHistory[division.name][name].shift()
  }

  if (devProgress < 100) {
    return "MP*1.0"
  }

  const currMulti = parseMultiplier(currentPrice.toString())
  if (stockHistory[division.name][name].length !== 5) {
    let newMulti = currMulti

    if (Math.min(...stockHistory[division.name][name]) > 0 && currMulti >= 1.1) {
      newMulti = currMulti - 0.1
    } else if (currMulti < MAX_MULTIPLIER) {
      newMulti = currMulti + 0.05
    } else if (currMulti > MAX_MULTIPLIER) {
      newMulti = MAX_MULTIPLIER
    }

    return "MP*" + formatNum(ns, newMulti)
  }

  return currentPrice.toString()
}

function buyResearch(ns: NS, division: Division) {
  if (!ns.corporation.hasUnlockUpgrade("Office API")) {
    return
  }

  if (division.research > 10_000 && !ns.corporation.hasResearched(division.name, "Hi-Tech R&D Laboratory")) {
    ns.corporation.research(division.name, "Hi-Tech R&D Laboratory")
  }

  if (division.research > 20_000 && !ns.corporation.hasResearched(division.name, "Market-TA.I")) {
    ns.corporation.research(division.name, "Market-TA.I")
  }

  if (division.research > 50_000 && !ns.corporation.hasResearched(division.name, "Market-TA.II")) {
    ns.corporation.research(division.name, "Market-TA.II")
  }
}

function upgradeOffice(ns: NS, division: string, city: string, limit: number): void {
  if (!ns.corporation.hasUnlockUpgrade("Office API")) {
    return
  }

  const office = ns.corporation.getOffice(division, city)
  const budget = ns.corporation.getCorporation().funds / 2

  if (office.size < limit) {
    let upgradeSize = 60
    let cost = ns.corporation.getOfficeSizeUpgradeCost(division, city, upgradeSize)

    while (cost > budget) {
      upgradeSize -= 3
      if (upgradeSize < 1) {
        return
      }
      cost = ns.corporation.getOfficeSizeUpgradeCost(division, city, upgradeSize)
    }

    //ns.print(
    //  `${division}/${city} Size: ${office.size} upgrade to ${
    //    office.size + upgradeSize
    //  } (+${upgradeSize}) cost ${formatMoney(ns, cost)}`,
    //)

    ns.corporation.upgradeOfficeSize(division, city, upgradeSize)
    ns.print(
      `${division}/${city} expanded office by ${upgradeSize} to ${office.size + upgradeSize} for ${formatMoney(
        ns,
        cost,
      )}`,
    )
  }
}

async function manageOffices(ns: NS, division: Division): Promise<void> {
  if (!ns.corporation.hasUnlockUpgrade("Office API")) {
    return
  }

  if (!ns.corporation.getDivision(division.name).cities.includes(CORP_MAIN_CITY)) {
    return
  }

  const mainCitySize = ns.corporation.getOffice(division.name, CORP_MAIN_CITY).size
  for (const city of division.cities) {
    if (city === CORP_MAIN_CITY) {
      upgradeOffice(ns, division.name, city, mainCitySize + 15)
    } else {
      upgradeOffice(ns, division.name, city, mainCitySize - (mainCitySize < 60 ? 0 : 60))
    }

    while (
      ns.corporation.getOffice(division.name, city).employees.length <
      ns.corporation.getOffice(division.name, city).size
    ) {
      ns.corporation.hireEmployee(division.name, city)
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

  if (employeeJobs.Unassigned > 0 || employeeJobs.Training > 0) {
    //for (const pos of Object.keys(ratio)) {
    //  await ns.corporation.setAutoJobAssignment(division, city, pos, 0)
    //}

    for (const [pos, posRatio] of Object.entries(ratio)) {
      const newEmployees = Math.floor(posRatio * ns.corporation.getOffice(division, city).size)
      if (newEmployees === employeeJobs[pos as keyof EmployeeJobs]) {
        continue
      }

      await ns.corporation.setAutoJobAssignment(
        division,
        city,
        pos,
        Math.floor(posRatio * ns.corporation.getOffice(division, city).size),
      )
    }

    const jobs = ns.corporation.getOffice(division, city).employeeJobs
    const researchCount = jobs.Unassigned + jobs.Training + jobs["Research & Development"]

    await ns.corporation.setAutoJobAssignment(division, city, "Research & Development", researchCount)

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
  return ns.corporation
    .getDivision(division)
    .cities.filter((c) => ns.corporation.hasWarehouse(division, c))
    .map((c) => ns.corporation.getWarehouse(division, c))
}

function manageWarehouses(ns: NS, division: Division): void {
  const hasSmartSupply = ns.corporation.hasUnlockUpgrade("Smart Supply")

  for (const city of division.cities) {
    if (!ns.corporation.hasWarehouse(division.name, city)) {
      if (ns.corporation.getPurchaseWarehouseCost() > ns.corporation.getCorporation().funds) {
        continue
      }

      ns.corporation.purchaseWarehouse(division.name, city)
    }

    if (!ns.corporation.getWarehouse(division.name, city).smartSupplyEnabled && hasSmartSupply) {
      ns.corporation.setSmartSupply(division.name, city, true)
    }
  }
}

function expandWarehouses(ns: NS, division: Division): void {
  const warehouses = getWarehouses(ns, division.name).sort(sortFunc((w) => w.size))
  if (warehouses.length === 0) {
    return
  }

  const smallestWarehouse = warehouses[0]
  const city = smallestWarehouse.loc

  if (smallestWarehouse.size > 15_000 && ns.corporation.getCorporation().funds < 1_000_000_000_000) {
    return
  }

  const funds = ns.corporation.getCorporation().funds / 2
  let upgrades = 60
  let cost = Infinity

  while (cost > funds) {
    cost = ns.corporation.getUpgradeWarehouseCost(division.name, city, upgrades)
    upgrades -= 1

    if (upgrades < 1) {
      return
    }
  }

  ns.corporation.upgradeWarehouse(division.name, city, upgrades)
  ns.print(
    `${division.name}/${city} upgraded warehouse ${upgrades}x to ${formatNum(
      ns,
      ns.corporation.getWarehouse(division.name, city).size,
      "0,0",
    )} for ${formatMoney(ns, cost)}`,
  )
}

function manageAdVert(ns: NS, division: Division): void {
  if (!ns.corporation.hasUnlockUpgrade("Office API")) {
    return
  }

  while (ns.corporation.getHireAdVertCost(division.name) < ns.corporation.getCorporation().funds / 2) {
    const adCost = ns.corporation.getHireAdVertCost(division.name)
    ns.corporation.hireAdVert(division.name)
    ns.print(`${division.name} hired AdVert for ${formatMoney(ns, adCost)}`)
  }
}

/*****************************************
 *            DECISION TREE
 * 1. If we don't have them buy Office & Warehouse API, and Smart Supply
 * 2. If we don't have a division, expand into Tobacco
 * 3. Buy warehouse
 * 4. Enable smart supply
 * 5. Develop product
 ******************************/

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  let ticks = 0

  const flags = ns.flags(flagSchema) as Flags & ScriptArgs

  while (true) {
    await ns.asleep(1000)

    const corp = ns.corporation.getCorporation()
    if (!corp.divisions.map((d) => d.type).includes(flags.industry)) {
      if (ns.corporation.getExpandIndustryCost(flags.industry) > corp.funds / 2) {
        continue
      }

      ns.corporation.expandIndustry(flags.industry, "Z" + flags.division)
    }

    const division = ns.corporation.getDivision(flags.division)

    ns.print("# Manage Materials")
    buyMaterials(ns, corp, division)

    if (ticks % 10 === 0) {
      ns.print("# Manage Expansions")
      if (division.cities.length < 6) {
        for (const city of ["Volhaven", "Sector-12", "Aevum", "Ishima", "New Tokyo", "Chongqing"]) {
          if (division.cities.includes(city)) {
            continue
          }

          if (ns.corporation.getCorporation().funds / 2 < ns.corporation.getExpandCityCost()) {
            break
          }

          ns.corporation.expandCity(division.name, city)
          ns.print("Expanded to: " + city)
        }
      }

      ns.print("# Manage Offices")
      await manageOffices(ns, division)

      ns.print("# Manage Warehouses")
      manageWarehouses(ns, division)

      if (ns.corporation.getOffice(division.name, CORP_MAIN_CITY).size >= 15) {
        ns.print("# Expand Warehouses")
        expandWarehouses(ns, division)

        ns.print("# Manage Adverts")
        manageAdVert(ns, division)
      }

      ns.print("# Adjust Prices")
      if (division.name in stockHistory) {
        const tableData = Object.entries(stockHistory[division.name]).map(([prod, val]) => [
          prod,
          ...val.map((v) => formatNum(ns, v)),
        ])
        tableData.unshift(["Product", "Stock", "Stock -1", "Stock -2", "Stock -3", "Stock -4"])
        if (tableData.length > 0) {
          ns.print(renderTable(ns, tableData))
        }
      }

      if (division.cities.includes(CORP_MAIN_CITY)) {
        adjustPrices(ns, division)

        if (division.makesProducts) {
          ns.print("# Manage Products")
          developAndDiscontinue(ns, division, ticks)
        }
      }

      ns.print("# Manage Research")
      buyResearch(ns, division)
    }

    await ns.asleep(1000)
    ticks++
  }
}
