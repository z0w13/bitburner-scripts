import type { NS } from "@ns"
import type { BitNodeMultipliers } from "@ns"

export function getBitNodeMultipliers(ns: NS): BitNodeMultipliers {
  const hasSourceFile5 =
    ns.singularity
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
    PurchasedServerSoftcap: 1,
    PurchasedServerLimit: 1,
    PurchasedServerMaxRam: 1,

    CorporationSoftcap: 1,
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
