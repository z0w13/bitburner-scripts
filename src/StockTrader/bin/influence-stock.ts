import type { NS, CityName, CompanyName, LocationName, Server, Skills } from "@ns"
import { onStockTick } from "@/StockTrader/lib/Shared"
import { FakeTradeStockSource } from "@/StockTrader/lib/StockSource"
import { loadConfig } from "@/StockTrader/lib/Config"
import { getAnalyserData, getAnalyserPid } from "@/StockTrader/lib/Analyser"
import getSetupHosts from "@/lib/func/get-setup-hosts"
import { getGrowCommand, getHackCommand, getWeakenCommand } from "@/Command/Basic"
import runCommand from "@/lib/func/run-command"
import waitForPids from "@/lib/func/wait-for-pids"
import Logger from "@/lib/Logger"
import { LOG_LEVEL } from "@/config"
import { WorkType } from "@/AdditionalNetscriptDefinitions"
import { formatMoney, formatNum, formatTime } from "@/lib/util"

const LONG_OWNED_IDX = 0

/**
 * Get the city for a {@link LocationName}
 *
 * @remarks
 * This assumes that LocationName keys follow a pattern of <City><Company> to
 * map the LocatioName to a {@link CityName}
 *
 * @param ns The {@link NS} object
 * @param location Name of the company
 *
 * @returns The location's city or undefined if none was found
 */
function getLocationCity(ns: NS, location: LocationName): CityName | undefined {
  const locationCityMap: Partial<Record<LocationName, CityName>> = {}

  for (const [key, name] of Object.entries(ns.enums.LocationName)) {
    for (const [cityKey, cityName] of Object.entries(ns.enums.CityName)) {
      if (key.startsWith(cityKey)) {
        locationCityMap[name] = cityName
      }
    }
  }

  return locationCityMap[location]
}

/**
 * Get the location of a company
 *
 * @remarks
 * This uses that LocationName keys follow a pattern of <City><Company> to
 * map the commpany name to a location
 *
 * @param ns The {@link NS} object
 * @param name Name of the company
 *
 * @returns The company's location or undefined if none was found
 */
function getCompanyLocation(ns: NS, name: CompanyName): LocationName | undefined {
  const companyCityMap: Partial<Record<CompanyName, LocationName>> = {}

  for (const [companyKey, companyName] of Object.entries(ns.enums.CompanyName)) {
    for (const [locationKey, locationName] of Object.entries(ns.enums.LocationName)) {
      if (locationKey.endsWith(companyKey)) {
        companyCityMap[companyName] = locationName
      }
    }
  }

  return companyCityMap[name]
}

/**
 * automatically handle moving to the specified location
 *
 * @param ns The {@link NS} object
 * @param location The {@link LocationName} to go to
 *
 * @returns a boolean indicating if we arrived at the destination
 */
function goToLocation(ns: NS, location: LocationName): boolean {
  const player = ns.getPlayer()

  // already at destination
  if (player.location === location) {
    return true
  }

  const locationCity = getLocationCity(ns, location)
  if (!locationCity) {
    ns.tprintf("ERROR: unknown city for location: %s", location)
    return false
  }

  if (player.city !== locationCity) {
    if (!ns.singularity.travelToCity(locationCity)) {
      ns.tprintf("ERROR: couldn't travel to city: %s", locationCity)
      return false
    }
  }

  if (!ns.singularity.goToLocation(location)) {
    ns.tprintf("ERROR: couldn't travel to location: %s", location)
    return false
  }

  return true
}

/**
 * Check whether a set of skills match the requirements
 *
 * @param skills The skills to check
 * @param required The skill requirements
 *
 * @returns whether the requirements are met
 */
function hasSkillsRequired(skills: Skills, required: Skills): boolean {
  return (
    skills.agility >= required.agility &&
    skills.charisma >= required.charisma &&
    skills.defense >= required.defense &&
    skills.dexterity >= required.dexterity &&
    skills.hacking >= required.hacking &&
    skills.intelligence >= required.intelligence &&
    skills.strength >= required.strength
  )
}

/**
 * Verifies (and narrows) a string to a {@link CompanyName}
 */
function isCompany(ns: NS, org: string): org is CompanyName {
  return (Object.values(ns.enums.CompanyName) as Array<string>).includes(org)
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const conf = loadConfig(ns)
  const source = conf.mock ? new FakeTradeStockSource(ns.stock) : ns.stock
  const log = new Logger(ns, LOG_LEVEL, "InfluenceStock")

  await onStockTick(ns, source, async () => {
    const analyserPid = getAnalyserPid(ns)
    if (analyserPid === 0) {
      ns.print("WARN: No analyser running...")
      return
    }
    const analysisData = getAnalyserData(ns, analyserPid)

    const orgToServerMap: Record<string, Server> = Object.fromEntries(
      getSetupHosts(ns).map((host) => {
        const server = ns.getServer(host)
        return [server.organizationName, server]
      }),
    )

    const ownedStocksByValueDesc = Object.values(analysisData.stockCycleData)
      // filter to only stocks we own
      .filter((stock) => {
        const [longOwned, _longVal, shortOwned, _shortVal] = source.getPosition(stock.sym)
        return longOwned > 0 || shortOwned > 0
      })
      // sort by value
      .toSorted((a, b) => {
        const [aLongOwned, aLongVal, aShortOwned, aShortVal] = source.getPosition(a.sym)
        const [bLongOwned, bLongVal, bShortOwned, bShortVal] = source.getPosition(b.sym)

        const aTotalVal = aLongOwned * aLongVal + aShortOwned * aShortVal
        const bTotalVal = bLongOwned * bLongVal + bShortOwned * bShortVal

        return aTotalVal - bTotalVal
      })
      // reverse from ascending to descending
      .toReversed()

    // Find the first stock that has a server we can hack + grow/weaken
    // to manipulate the stock prices
    const firstStockWithServer = ownedStocksByValueDesc.find((stock) => {
      const server = orgToServerMap[ns.stock.getOrganization(stock.sym)]
      if (!server) {
        log.info("%s has no server", ns.stock.getOrganization(stock.sym))
        return false
      }

      if (!server.moneyMax || server.moneyAvailable === undefined) {
        log.info("%s has no money", server.hostname)
        return false
      }

      const [longOwned, _longVal, shortOwned, _shortVal] = source.getPosition(stock.sym)
      if (longOwned > 0 && server.moneyAvailable < server.moneyMax * 0.9) {
        log.info(
          "we have %s long stocks in %s, and %s has %s/%s money which is less than 90%% of total",
          formatNum(ns, longOwned, 0),
          stock.sym,
          server.hostname,
          formatMoney(ns, server.moneyAvailable),
          formatMoney(ns, server.moneyMax),
        )

        return true
      }

      if (shortOwned > 0 && server.moneyAvailable > server.moneyMax * 0.1) {
        log.info(
          "we have %s short stocks in %s, and %s has %s/%s money which is more than 10%% of total",
          formatNum(ns, shortOwned, 0),
          stock.sym,
          server.hostname,
          formatMoney(ns, server.moneyAvailable),
          formatMoney(ns, server.moneyMax),
        )

        return true
      }

      return false
    })

    // Find the first stock that has a job we could work to influence stock value
    const firstLongStockWithJob = ownedStocksByValueDesc.find((stock) => {
      const stockOrg = ns.stock.getOrganization(stock.sym)
      if (!isCompany(ns, stockOrg)) {
        return false
      }

      return (
        ns.singularity.getCompanyPositions(stockOrg).length > 0 && source.getPosition(stock.sym)[LONG_OWNED_IDX] > 0
      )
    })

    // If we found a stock with a job, try and perform that job
    if (firstLongStockWithJob) {
      const jobOrg = ns.stock.getOrganization(firstLongStockWithJob.sym) as CompanyName
      const jobLocation = getCompanyLocation(ns, jobOrg)

      // Check if we're already working for this company
      const isWorkingForCompany =
        ns.singularity.getCurrentWork()?.type == WorkType.COMPANY &&
        jobLocation &&
        ns.getPlayer().location == jobLocation

      if (!isWorkingForCompany && jobLocation) {
        const jobPositions = ns.singularity.getCompanyPositions(jobOrg)

        // Loop through all the positions to find one we match the criteria of
        for (const position of jobPositions) {
          const positionInfo = ns.singularity.getCompanyPositionInfo(jobOrg, position)

          // If we meet the job requirements, try and move there, apply for it and work it
          if (
            positionInfo.requiredReputation >= ns.singularity.getCompanyRep(jobOrg) &&
            hasSkillsRequired(ns.getPlayer().skills, positionInfo.requiredSkills)
          ) {
            log.info(
              "Met requirements for job %s at %s (%s), moving there and applying",
              positionInfo.name,
              jobOrg,
              firstLongStockWithJob.sym,
            )

            if (!goToLocation(ns, jobLocation)) {
              log.error("Failed to move to job location %s", jobLocation)
              break
            }

            const jobName = ns.singularity.applyToCompany(jobOrg, positionInfo.field)
            if (!jobName) {
              log.error("Failed to apply", positionInfo.name)
              break
            }

            log.info("Am now %s, starting work", jobName)
            if (!ns.singularity.workForCompany(jobOrg)) {
              log.error("Failed to work as %s", jobName)
              break
            }

            break
          }
        }
      }
    }

    // If we found a server for a stock we own (and it has money)
    // hack/grow it based on whether we're shorting or holding
    if (firstStockWithServer) {
      const serverOrg = ns.stock.getOrganization(firstStockWithServer.sym) as CompanyName
      const orgServer = orgToServerMap[serverOrg]
      const [longOwned, _longVal, shortOwned, _shortVal] = source.getPosition(firstStockWithServer.sym)

      log.info(
        "%s owned by %s (%s), short stocks %s, long stocks %s, money %s/%s",
        orgServer.hostname,
        serverOrg,
        firstStockWithServer.sym,
        formatNum(ns, shortOwned, 0),
        formatNum(ns, longOwned, 0),
        formatMoney(ns, orgServer.moneyAvailable ?? 0),
        formatMoney(ns, orgServer.moneyMax ?? 0),
      )

      const weakenCmd = getWeakenCommand(ns, orgServer.hostname)
      if (shortOwned > 0) {
        const hackCmd = getHackCommand(ns, orgServer.hostname)
        log.info("Weakening %s for %s...", orgServer.hostname, formatTime(weakenCmd.getTotalTime()))
        await waitForPids(ns, runCommand(ns, weakenCmd, {}))
        log.info("Hacking %s for %s...", orgServer.hostname, formatTime(hackCmd.getTotalTime()))
        await waitForPids(ns, runCommand(ns, hackCmd, {}))
      } else if (longOwned > 0) {
        const growCmd = getGrowCommand(ns, orgServer.hostname)
        log.info("Weakening %s for %s...", orgServer.hostname, formatTime(weakenCmd.getTotalTime()))
        await waitForPids(ns, runCommand(ns, weakenCmd, {}))
        log.info("Growing %s for %s...", orgServer.hostname, formatTime(growCmd.getTotalTime()))
        await waitForPids(ns, runCommand(ns, growCmd, {}))
      }
    }
  })
}
