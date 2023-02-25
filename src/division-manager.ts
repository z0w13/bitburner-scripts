import type {
  NS,
  Division,
  CorporationInfo,
  Warehouse,
  CorpEmployeePosition,
  CorpIndustryName,
  CorpMaterialName,
} from "@ns"
import { CityName } from "/data/StaticDefs"
import parseFlags from "/lib/parseFlags"
import { CORP_MAIN_CITY, LOG_LEVEL } from "/config"
import renderTable from "/lib/func/render-table"
import { formatMoney, formatNum, sortFunc } from "/lib/util"
import Logger from "/lib/Logger"
import RingBuffer from "/lib/RingBuffer"

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

// Constants
const PROD_MULTI_MATERIALS: Array<CorpMaterialName> = ["Robots", "Hardware", "AI Cores", "Real Estate"]

// Config
const MAX_MP_MULTIPLIER = 100 // Maximum multiplier above market price for products to be adjusted to

// History of product stocks, used to adjust prices when we don't yet have Market-TA.II
const stockHistory: Record<string, Record<string, RingBuffer<number>>> = {}

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

function getFinishedProducts(ns: NS, division: Division): Array<string> {
  return division.products.filter(
    (product) => ns.corporation.getProduct(division.name, product).developmentProgress === 100,
  )
}

function buyMaterials(ns: NS, corp: CorporationInfo, division: Division): void {
  for (const city of division.cities) {
    if (!ns.corporation.hasWarehouse(division.name, city)) {
      continue
    }
    const hasBulkBuy = ns.corporation.hasResearched(division.name, "Bulk Purchasing")
    const warehouseSize = ns.corporation.getWarehouse(division.name, city).size
    // TODO: Use material size/required for warehouse space

    // TODO: Check factors for materials to optimise space for more effective ones

    // TODO: Base off of actual cycle times
    const materialDivider = ns.corporation.getBonusTime() > 0 ? 100 : 10
    const spaceForMaterials = warehouseSize * 0.8 - 100 // 80% to have growing space left, -100 to always have some space
    const spacePerMaterial = Math.floor(spaceForMaterials / PROD_MULTI_MATERIALS.length)

    for (const material of PROD_MULTI_MATERIALS) {
      const materialSize = ns.corporation.getMaterialData(material).size
      const storedMaterialQty = ns.corporation.getMaterial(division.name, city, material).qty
      const storedMaterialSize = storedMaterialQty * materialSize

      if (storedMaterialSize < spacePerMaterial) {
        // Not enough of material
        if (hasBulkBuy) {
          ns.corporation.buyMaterial(division.name, city, material, 0)
          ns.corporation.sellMaterial(division.name, city, material, "0", "")

          const targetQty = spacePerMaterial / materialSize
          const buyAmount = targetQty - storedMaterialQty
          ns.corporation.bulkPurchase(division.name, city, material, buyAmount)
        } else {
          const sizePerSec = (spacePerMaterial - storedMaterialSize) / materialDivider
          const toBuyPerSec = sizePerSec / materialSize

          ns.corporation.buyMaterial(division.name, city, material, toBuyPerSec)
          ns.corporation.sellMaterial(division.name, city, material, "0", "")
        }
      } else if (storedMaterialSize > spacePerMaterial + 40) {
        // Too much of material
        const sizePerSec = (storedMaterialSize - spacePerMaterial) / materialDivider
        const toSellPerSec = sizePerSec / materialSize

        ns.corporation.buyMaterial(division.name, city, material, 0)
        ns.corporation.sellMaterial(division.name, city, material, toSellPerSec.toString(), "MP*0.1")
      } else {
        // Correct amount
        ns.corporation.buyMaterial(division.name, city, material, 0)
        ns.corporation.sellMaterial(division.name, city, material, "0", "")
      }
    }
  }
}

function isDevelopingProduct(ns: NS, division: Division): boolean {
  return (
    division.products.map((p) => ns.corporation.getProduct(division.name, p)).filter((p) => p.developmentProgress < 100)
      .length > 0
  )
}

function developAndDiscontinue(ns: NS, division: Division, ticks: number): void {
  if (ns.corporation.getCorporation().funds < 0) {
    return
  }

  if (isDevelopingProduct(ns, division)) {
    return
  }

  // If we are at the product limit remove one with lowest quality
  if (division.products.length >= getProductLimit(ns, division.name)) {
    const lowestQual = division.products
      .map((p) => ns.corporation.getProduct(division.name, p))
      .sort(sortFunc((m) => m.rat))[0].name

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

  // Adjust material prices for industries that produce non-products
  if (division.type in nonProductMap) {
    for (const materialName of nonProductMap[division.type]) {
      for (const city of division.cities) {
        if (hasTAII) {
          ns.corporation.sellMaterial(division.name, city, materialName, "MAX", "MP")
          ns.corporation.setMaterialMarketTA2(division.name, city, materialName, true)
        } else {
          // Adjust price based on historical stock + current price
          const mat = ns.corporation.getMaterial(division.name, CORP_MAIN_CITY, materialName)
          const qty = mat.qty
          const price = getNewPrice(ns, division, mat.name, qty, 100, mat.sCost)

          // Only update if price changed
          if (price !== mat.sCost) {
            ns.corporation.sellMaterial(division.name, city, mat.name, "MAX", price)
          }
        }
      }
    }
  }

  // Adjust prices of products
  for (const productName of getFinishedProducts(ns, division)) {
    if (hasTAII) {
      ns.corporation.sellProduct(division.name, CORP_MAIN_CITY, productName, "MAX", "MP", true)
      ns.corporation.setProductMarketTA2(division.name, productName, true)
    } else {
      // Adjust price based on historical stock + current price
      const product = ns.corporation.getProduct(division.name, productName)
      const [qty] = product.cityData[CORP_MAIN_CITY]
      const price = getNewPrice(ns, division, product.name, qty, product.developmentProgress, product.sCost)

      // Only update if price changed
      if (price !== product.sCost) {
        ns.corporation.sellProduct(division.name, CORP_MAIN_CITY, product.name, "MAX", price, true)
      }
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
    stockHistory[division.name][name] = new RingBuffer<number>(5)
  }
  stockHistory[division.name][name].push(qty)

  if (devProgress < 100) {
    return "MP*1.0"
  }

  const currMulti = parseMultiplier(currentPrice.toString())

  let newMulti = currMulti

  if (Math.min(...stockHistory[division.name][name].getNonEmpty()) > 0 && currMulti >= 1.1) {
    newMulti = currMulti - 0.1
  } else if (currMulti < MAX_MP_MULTIPLIER) {
    newMulti = currMulti + 0.05
  } else if (currMulti > MAX_MP_MULTIPLIER) {
    newMulti = MAX_MP_MULTIPLIER
  }

  return "MP*" + ns.formatNumber(newMulti)
}

// TODO: Rework to prioritise certain researches (maybe even prioritise having points over researching certain things?)
function buyResearch(ns: NS, division: Division) {
  if (!ns.corporation.hasUnlockUpgrade("Office API")) {
    return
  }

  const toResearch = ["Hi-Tech R&D Laboratory", "Market-TA.I", "Market-TA.II", "AutoBrew", "AutoPartyManager"]
  for (const research of toResearch) {
    if (ns.corporation.hasResearched(division.name, research)) {
      continue
    }

    if (division.research > ns.corporation.getResearchCost(division.name, research)) {
      ns.corporation.research(division.name, research)
    } else {
      break
    }
  }
}

function upgradeOffice(ns: NS, division: string, city: CityName, limit: number): void {
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
      ns.corporation.getOffice(division.name, city).employees < ns.corporation.getOffice(division.name, city).size
    ) {
      ns.corporation.hireEmployee(division.name, city)
    }
    await redistributeEmployees(ns, division.name, city)
  }
}

async function redistributeEmployees(ns: NS, division: string, city: CityName): Promise<void> {
  const ratio: Record<CorpEmployeePosition, number> = {
    Business: 0.166,
    Engineer: 0.066,
    Management: 0.25,
    Operations: 0.35,
    "Research & Development": 0.166,
    Training: 0,
    Unassigned: 0,
  }

  const employeeJobs = ns.corporation.getOffice(division, city).employeeJobs

  if (employeeJobs.Unassigned > 0 || employeeJobs.Training > 0) {
    for (const pos in ratio) {
      const posRatio = ratio[pos as CorpEmployeePosition]
      const newEmployees = Math.floor(posRatio * ns.corporation.getOffice(division, city).size)
      if (newEmployees === employeeJobs[pos as CorpEmployeePosition]) {
        continue
      }

      ns.corporation.setAutoJobAssignment(
        division,
        city,
        pos,
        Math.floor(posRatio * ns.corporation.getOffice(division, city).size),
      )
    }

    const jobs = ns.corporation.getOffice(division, city).employeeJobs
    const researchCount = jobs.Unassigned + jobs.Training + jobs["Research & Development"]

    ns.corporation.setAutoJobAssignment(division, city, "Research & Development", researchCount)

    const newEmployeeJobs = ns.corporation.getOffice(division, city).employeeJobs
    ns.print(`${division}/${city} reassigned employees `, newEmployeeJobs)
  }
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
      if (ns.corporation.getConstants().warehouseInitialCost > ns.corporation.getCorporation().funds) {
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
    `${division.name}/${city} upgraded warehouse ${upgrades}x to ${ns.formatNumber(
      ns.corporation.getWarehouse(division.name, city).size,
      0,
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

function hasIndustry(ns: NS, industry: CorpIndustryName): boolean {
  return ns.corporation
    .getCorporation()
    .divisions.map((d) => ns.corporation.getDivision(d).type)
    .includes(industry)
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
  const logger = new Logger(ns, LOG_LEVEL, "DivisionManager")
  const flags = parseFlags(ns, {
    division: "ZSmokes",
    industry: "Tobacco" as CorpIndustryName,
  })

  let ticks = 0

  while (true) {
    await ns.asleep(1000)

    const corp = ns.corporation.getCorporation()
    if (!hasIndustry(ns, flags.industry)) {
      if (ns.corporation.getIndustryData(flags.industry).startingCost > corp.funds) {
        continue
      }

      ns.corporation.expandIndustry(flags.industry, flags.division)
    }

    const division = ns.corporation.getDivision(flags.division)

    logger.info("Manage Materials")
    buyMaterials(ns, corp, division)

    if (ticks % 10 === 0) {
      logger.info("Manage Expansions")
      if (division.cities.length < 6) {
        for (const city of Object.values(CityName)) {
          if (division.cities.includes(city)) {
            continue
          }

          if (ns.corporation.getCorporation().funds / 2 < ns.corporation.getConstants().officeInitialCost) {
            break
          }

          ns.corporation.expandCity(division.name, city)
          logger.info("Expanded to: " + city)
        }
      }

      logger.info("Manage Offices")
      await manageOffices(ns, division)

      logger.info("Manage Warehouses")
      manageWarehouses(ns, division)

      if (ns.corporation.getOffice(division.name, CORP_MAIN_CITY).size >= 15) {
        logger.info("Expand Warehouses")
        expandWarehouses(ns, division)

        logger.info("Manage Adverts")
        manageAdVert(ns, division)
      }

      logger.info("Adjust Prices")
      if (division.name in stockHistory) {
        const tableData = Object.entries(stockHistory[division.name]).map(([prod, val]) => [
          prod,
          ...val.getNonEmpty().map((v) => ns.formatNumber(v)),
        ])
        tableData.unshift(["Product", "Stock", "Stock -1", "Stock -2", "Stock -3", "Stock -4"])
        if (tableData.length > 0) {
          renderTable(ns, tableData)
            .split("\n")
            .forEach((row) => logger.info(row))
        }
      }

      if (division.cities.includes(CORP_MAIN_CITY)) {
        adjustPrices(ns, division)

        if (division.makesProducts) {
          logger.info("Manage Products")
          developAndDiscontinue(ns, division, ticks)
        }
      }

      logger.info("Manage Research")
      buyResearch(ns, division)
    }

    ticks++
    await ns.asleep(1000)
  }
}
