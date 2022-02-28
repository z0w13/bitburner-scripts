import { NS } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"
import { sortFunc } from "/lib/util"

enum ActionType {
  TRAIN_HACKING = "Algorithms",
  TRAIN_CHARISMA = "Leadership",
  TRAIN_STRENGTH = "strength",
  TRAIN_DEFENSE = "defense",
  TRAIN_DEXTERITY = "dexterity",
  TRAIN_AGILITY = "agility",
  CRIME = "crime",
  IDLE = "idle",
  WORK = "work",
  FACTION_REP = "faction rep",
}

const CRIMES = new Set(
  [
    "Shoplift",
    "Rob Store",
    "Mug",
    "Larceny",
    "Deal Drugs",
    "Bond Forgery",
    "Traffick Arms",
    "Homicide",
    "Grand Theft Auto",
    "Kidnap",
    "Assassination",
    "Heist",
  ].reverse(),
)

function getDesiredAction(ns: NS, statLimit = 10): ActionType {
  const player = ns.getPlayer()
  if (player.hacking < statLimit) {
    return ActionType.TRAIN_HACKING
  }
  if (player.strength < statLimit) {
    return ActionType.TRAIN_STRENGTH
  }
  if (player.defense < statLimit) {
    return ActionType.TRAIN_DEFENSE
  }
  if (player.dexterity < statLimit) {
    return ActionType.TRAIN_DEXTERITY
  }
  if (player.agility < statLimit) {
    return ActionType.TRAIN_AGILITY
  }
  if (player.charisma < statLimit) {
    return ActionType.TRAIN_CHARISMA
  }
  if (getBestCrimeAboveThreshold(ns)) {
    return ActionType.CRIME
  }

  return ActionType.CRIME
}

interface AugmentPurchaseInfo {
  name: string
  rep: number
  price: number
  factions: Array<string>
}

function getAugmentPurchaseInfo(ns: NS): Array<AugmentPurchaseInfo> {
  const player = ns.getPlayer()
  const factions = player.factions as Array<string>

  const augs: Record<string, AugmentPurchaseInfo> = {}

  for (const faction of factions) {
    for (const aug of ns.getAugmentationsFromFaction(faction)) {
      const rep = ns.getAugmentationRepReq(aug)
      const money = ns.getAugmentationPrice(aug)

      if (aug in augs) {
        augs[aug].factions.push(aug)
      } else {
        augs[aug] = {
          name: aug,
          rep: rep,
          price: money,
          factions: [faction],
        }
      }
    }
  }

  return Object.values(augs)
}

function getLowestRepAug(ns: NS): AugmentPurchaseInfo | undefined {
  const augs = getAugmentPurchaseInfo(ns)
  if (augs.length === 0) {
    return
  }

  return augs.sort(sortFunc((v) => v.rep))[0]
}

const PROGRAM_MAP: Record<string, number> = {
  "BruteSSH.exe": 500_000,
  "FTPCrack.exe": 1_500_000,
  "relaySMTP.exe": 5_000_000,
  "HTTPWorm.exe": 30_000_000,
  "SQLInject.exe": 250_000_000,

  "DeepscanV1.exe": 500_000,
  "DeepscanV2.exe": 25_000_000,
  "AutoLink.exe": 1_000_000,

  "Formulas.exe": 5_000_000_000,
}

const UNI_MAP: Record<string, string> = {
  "Sector-12": "Rothman University",
  Volhaven: "ZB Institute of Technology",
  Aevum: "Summit University",
}

const GYM_MAP: Record<string, string> = {
  "Sector-12": "Powerhouse Gym",
  Volhaven: "Millenium Fitness Gym",
  Aevum: "Snap Fitness Gym",
}

const BEST_UNI_CITY = "Volhaven"
const BEST_GYM_CITY = "Sector-12"

export function getJob(ns: NS, company: string): string | null | undefined {
  const jobs: Record<string, string> = ns.getPlayer().jobs
  if (company in jobs) {
    return jobs[company]
  }

  return null
}

function buyStuff(ns: NS): void {
  const player = ns.getPlayer()

  if (player.money > 200_000 && !player.tor) {
    ns.purchaseTor()
    player.money -= 200_000
  }

  if (player.tor) {
    for (const [prog, cost] of Object.entries(PROGRAM_MAP)) {
      if (player.money > cost && !ns.fileExists(prog, "home")) {
        ns.purchaseProgram(prog)
        player.money -= cost
      }
    }
  }

  if (ns.getUpgradeHomeRamCost() < player.money) {
    player.money -= ns.getUpgradeHomeRamCost()
    ns.upgradeHomeRam()
  }
}

function acceptFactions(ns: NS): void {
  for (const faction of ns.checkFactionInvitations()) {
    ns.joinFaction(faction)
  }
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("disableLog")
  ns.disableLog("asleep")

  let action = ActionType.IDLE
  let targetStats = 10

  while (true) {
    await ns.asleep(1000)

    buyStuff(ns)
    acceptFactions(ns)

    const aug = getLowestRepAug(ns)
    if (aug) {
      ns.print(aug)
    }

    const player = ns.getPlayer()
    const desiredAction = getDesiredAction(ns, targetStats)

    if (player.workType === "") {
      action = ActionType.IDLE
    }

    if (action === desiredAction || player.crimeType.length > 0) {
      continue
    }

    if (player.isWorking) {
      ns.stopAction()
    }

    switch (desiredAction) {
      case ActionType.WORK:
        switch (player.city) {
          case "Sector-12": {
            if (!getJob(ns, "Joe's Guns")) {
              ns.applyToCompany("Joe's Guns", "Employee")
            }

            ns.workForCompany("Joe's Guns")
            break
          }
        }

        action = desiredAction
        break
      case ActionType.TRAIN_HACKING:
      case ActionType.TRAIN_CHARISMA: {
        const uniName =
          player.city !== BEST_UNI_CITY && !ns.travelToCity(BEST_UNI_CITY)
            ? UNI_MAP[player.city]
            : UNI_MAP[BEST_UNI_CITY]

        action = desiredAction
        ns.universityCourse(uniName, desiredAction, false)
        break
      }
      case ActionType.TRAIN_STRENGTH:
      case ActionType.TRAIN_DEFENSE:
      case ActionType.TRAIN_AGILITY:
      case ActionType.TRAIN_DEXTERITY: {
        const gymName =
          player.city !== BEST_GYM_CITY && !ns.travelToCity(BEST_GYM_CITY)
            ? GYM_MAP[player.city]
            : GYM_MAP[BEST_GYM_CITY]

        action = desiredAction
        ns.gymWorkout(gymName, desiredAction, false)
        break
      }
      case ActionType.CRIME:
        if (doCrime(ns)) {
          action = desiredAction
        } else {
          targetStats += 2
        }
        break
      default:
        break
    }
  }
}

function getBestCrimeAboveThreshold(ns: NS): string | null {
  for (const crime of CRIMES) {
    const chance = ns.getCrimeChance(crime)
    if (chance >= 0.8) {
      return crime
    }
  }

  return null
}

function doCrime(ns: NS): boolean {
  const crime = getBestCrimeAboveThreshold(ns)
  if (!crime) {
    return false
  }

  ns.commitCrime(crime)
  return true
}
