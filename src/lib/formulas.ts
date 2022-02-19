import { Server, Player, BitNodeMultipliers } from "@ns"

export function calculateIntelligenceBonus(intelligence: number, weight = 1): number {
  return 1 + (weight * Math.pow(intelligence, 0.8)) / 600
}

/**
 * Returns the chance the player has to successfully hack a server
 */
export function calculateHackingChance(server: Server, player: Player): number {
  const hackFactor = 1.75
  const difficultyMult = (100 - server.hackDifficulty) / 100
  const skillMult = hackFactor * player.hacking
  const skillChance = (skillMult - server.requiredHackingSkill) / skillMult
  const chance =
    skillChance * difficultyMult * player.hacking_chance_mult * calculateIntelligenceBonus(player.intelligence, 1)
  if (chance > 1) {
    return 1
  }
  if (chance < 0) {
    return 0
  }

  return chance
}

/**
 * Returns the amount of hacking experience the player will gain upon
 * successfully hacking a server
 */
export function calculateHackingExpGain(ns: NS, server: Server, player: Player): number {
  const baseExpGain = 3
  const diffFactor = 0.3
  if (server.baseDifficulty == null) {
    server.baseDifficulty = server.hackDifficulty
  }
  let expGain = baseExpGain
  expGain += server.baseDifficulty * diffFactor

  return expGain * player.hacking_exp_mult * getBitNodeMultipliers(ns).HackExpGain
}

/**
 * Returns the percentage of money that will be stolen from a server if
 * it is successfully hacked (returns the decimal form, not the actual percent value)
 */
export function calculatePercentMoneyHacked(ns: NS, server: Server, player: Player): number {
  // Adjust if needed for balancing. This is the divisor for the final calculation
  const balanceFactor = 240

  const difficultyMult = (100 - server.hackDifficulty) / 100
  const skillMult = (player.hacking - (server.requiredHackingSkill - 1)) / player.hacking
  const percentMoneyHacked =
    (difficultyMult * skillMult * player.hacking_money_mult * getBitNodeMultipliers(ns).ScriptHackMoney) / balanceFactor
  if (percentMoneyHacked < 0) {
    return 0
  }
  if (percentMoneyHacked > 1) {
    return 1
  }

  return percentMoneyHacked
}

/**
 * Returns time it takes to complete a hack on a server, in seconds
 */
export function calculateHackingTime(server: Server, player: Player): number {
  const difficultyMult = server.requiredHackingSkill * server.hackDifficulty

  const baseDiff = 500
  const baseSkill = 50
  const diffFactor = 2.5
  let skillFactor = diffFactor * difficultyMult + baseDiff
  // tslint:disable-next-line
  skillFactor /= player.hacking + baseSkill

  const hackTimeMultiplier = 5
  const hackingTime =
    (hackTimeMultiplier * skillFactor) /
    (player.hacking_speed_mult * calculateIntelligenceBonus(player.intelligence, 1))

  return hackingTime
}

/**
 * Returns time it takes to complete a grow operation on a server, in seconds
 */
export function calculateGrowTime(server: Server, player: Player): number {
  const growTimeMultiplier = 3.2 // Relative to hacking time. 16/5 = 3.2

  return growTimeMultiplier * calculateHackingTime(server, player)
}

/**
 * Returns time it takes to complete a weaken operation on a server, in seconds
 */
export function calculateWeakenTime(server: Server, player: Player): number {
  const weakenTimeMultiplier = 4 // Relative to hacking time

  return weakenTimeMultiplier * calculateHackingTime(server, player)
}

export function getBitNodeMultipliers(ns: NS): BitNodeMultipliers {
  const hasSourceFile5 =
    ns
      .getOwnedSourceFiles()
      .map((s) => s.n)
      .indexOf(5) > 0
  if (hasSourceFile5) {
    return ns.getBitNodeMultipliers()
  }

  return {
    HackingLevelMultiplier: 1,
    StrengthLevelMultiplier: 1,
    DefenseLevelMultiplier: 1,
    DexterityLevelMultiplier: 1,
    AgilityLevelMultiplier: 1,
    CharismaLevelMultiplier: 1,

    ServerGrowthRate: 1,
    ServerMaxMoney: 1,
    ServerStartingMoney: 1,
    ServerStartingSecurity: 1,
    ServerWeakenRate: 1,

    HomeComputerRamCost: 1,

    PurchasedServerCost: 1,
    PurchasedServerSoftCap: 1,
    PurchasedServerLimit: 1,
    PurchasedServerMaxRam: 1,

    CompanyWorkMoney: 1,
    CrimeMoney: 1,
    HacknetNodeMoney: 1,
    ManualHackMoney: 1,
    ScriptHackMoney: 1,
    ScriptHackMoneyGain: 1,
    CodingContractMoney: 1,

    ClassGymExpGain: 1,
    CompanyWorkExpGain: 1,
    CrimeExpGain: 1,
    FactionWorkExpGain: 1,
    HackExpGain: 1,

    FactionPassiveRepGain: 1,
    FactionWorkRepGain: 1,
    RepToDonateToFaction: 1,

    AugmentationMoneyCost: 1,
    AugmentationRepCost: 1,

    InfiltrationMoney: 1,
    InfiltrationRep: 1,

    FourSigmaMarketDataCost: 1,
    FourSigmaMarketDataApiCost: 1,

    CorporationValuation: 1,

    BladeburnerRank: 1,
    BladeburnerSkillCost: 1,

    GangSoftcap: 1,

    DaedalusAugsRequirement: 1,

    StaneksGiftPowerMultiplier: 1,
    StaneksGiftExtraSize: 0,

    WorldDaemonDifficulty: 1,
  }
}
