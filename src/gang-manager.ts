import type { GangMemberAscension, GangMemberInfo, NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import { renderProgress, sortFunc, sum } from "/lib/util"

type StatType = "hack" | "str" | "dex" | "def" | "agi" | "cha"
type Stats = Record<StatType, number>

const TARGET_ASC_MULT = 10
const TARGET_ASC_MULT_MOD = 1.05 // 5% increase of current multiplier
const TARGET_ATTRIB_MULT = TARGET_ASC_MULT * 10
const TARGET_TERRITORY = 1

enum GangAction {
  TrainHacking = "Train Hacking",
  TrainCombat = "Train Combat",
  TrainCharisma = "Train Charisma",
  TerritoryWarfare = "Territory Warfare",
  HumanTrafficking = "Human Trafficking",
  MoneyLaundering = "Money Laundering",
  Ascend = "Ascend",
}

function dictGetLowest(input: Record<string, number>): string | undefined {
  return Object.entries(input).sort(sortFunc((v) => v[1]))[0][0]
}

function getAscensionMults(info: GangMemberInfo): Stats {
  return {
    hack: info.hack_asc_mult,
    str: info.str_asc_mult,
    def: info.def_asc_mult,
    dex: info.dex_asc_mult,
    agi: info.agi_asc_mult,
    cha: info.cha_asc_mult,
  }
}

function getGoalStats(info: GangMemberInfo): Stats {
  return {
    hack: info.hack_asc_mult * TARGET_ATTRIB_MULT,
    str: info.str_asc_mult * TARGET_ATTRIB_MULT,
    def: info.def_asc_mult * TARGET_ATTRIB_MULT,
    dex: info.dex_asc_mult * TARGET_ATTRIB_MULT,
    agi: info.agi_asc_mult * TARGET_ATTRIB_MULT,
    cha: info.cha_asc_mult * TARGET_ATTRIB_MULT,
  }
}

// Scuffed name, but values return how much the current asc values are multiplied by
function getAscensionMultMods(ns: NS, info: GangMemberInfo): Stats {
  const asc = ns.gang.getAscensionResult(info.name)
  if (!asc) {
    return {
      hack: 1,
      str: 1,
      def: 1,
      dex: 1,
      agi: 1,
      cha: 1,
    }
  }

  return {
    hack: asc.hack,
    str: asc.str,
    def: asc.def,
    dex: asc.dex,
    agi: asc.agi,
    cha: asc.cha,
  }
}

function getNewAscensionMults(ns: NS, info: GangMemberInfo): Stats {
  const multMods = getAscensionMultMods(ns, info)
  return {
    hack: info.hack_asc_mult * multMods.hack,
    str: info.str_asc_mult * multMods.str,
    def: info.def_asc_mult * multMods.def,
    dex: info.dex_asc_mult * multMods.dex,
    agi: info.agi_asc_mult * multMods.agi,
    cha: info.cha_asc_mult * multMods.cha,
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function getAscensionMultIncrease(ns: NS, info: GangMemberInfo): Stats {
  const newAscMults = getNewAscensionMults(ns, info)
  return {
    hack: newAscMults.hack - info.hack_asc_mult,
    str: newAscMults.str - info.str_asc_mult,
    def: newAscMults.def - info.def_asc_mult,
    dex: newAscMults.dex - info.dex_asc_mult,
    agi: newAscMults.agi - info.agi_asc_mult,
    cha: newAscMults.cha - info.cha_asc_mult,
  }
}

function shouldAscend(ns: NS, info: GangMemberInfo): boolean {
  if (Math.min(...Object.values(getAscensionMults(info))) >= TARGET_ASC_MULT) {
    return false
  }

  const mods = getAscensionMultMods(ns, info)
  if (mods.cha > TARGET_ASC_MULT_MOD || mods.hack > TARGET_ASC_MULT_MOD) {
    return true
  }

  if (Math.min(mods.str, mods.def, mods.dex, mods.agi) > TARGET_ASC_MULT_MOD) {
    return true
  }

  return false
}

function upgradeMemberEquipment(ns: NS, info: GangMemberInfo): void {
  if (info.upgrades.length >= ns.gang.getEquipmentNames().length) {
    return
  }

  for (const equip of ns.gang.getEquipmentNames()) {
    if (ns.gang.getEquipmentCost(equip) > ns.getPlayer().money) {
      continue
    }
    ns.gang.purchaseEquipment(info.name, equip)
  }
}

interface GangMember {
  info: GangMemberInfo
  asc: GangMemberAscension | undefined
  task: GangAction
}

function getMemberInfo(ns: NS): Array<GangMember> {
  return ns.gang.getMemberNames().map((name) => ({
    info: ns.gang.getMemberInformation(name),
    asc: ns.gang.getAscensionResult(name),
    task: getMemberTask(ns, name),
  }))
}

function getMemberTask(ns: NS, name: string): GangAction {
  const info = ns.gang.getMemberInformation(name)
  const goalStats = getGoalStats(info)
  const numEquipment = ns.gang.getEquipmentNames().length

  if (shouldAscend(ns, info)) {
    return GangAction.Ascend
  }

  if (Math.min(...Object.values(getAscensionMults(info))) < TARGET_ASC_MULT) {
    const lowestAsc = dictGetLowest(getAscensionMults(info))
    switch (lowestAsc) {
      case "hack":
        return GangAction.TrainHacking
      case "str":
      case "def":
      case "dex":
      case "agi":
        return GangAction.TrainCombat
      case "cha":
        return GangAction.TrainCharisma
    }
  }

  if (info.hack < goalStats.hack) {
    return GangAction.TrainHacking
  } else if (
    info.str < goalStats.str ||
    info.def < goalStats.def ||
    info.dex < goalStats.dex ||
    info.agi < goalStats.agi
  ) {
    return GangAction.TrainCombat
  } else if (info.cha < goalStats.cha) {
    return GangAction.TrainCharisma
  }

  if (
    info.upgrades.length + info.augmentations.length < numEquipment ||
    ns.gang.getGangInformation().territory >= TARGET_TERRITORY
  ) {
    // TODO(zowie): Select task based on stats
    return ns.gang.getGangInformation().isHacking ? GangAction.MoneyLaundering : GangAction.HumanTrafficking
  } else {
    return GangAction.TerritoryWarfare
  }
}

function printStatus(ns: NS): void {
  const members = ns.gang.getMemberNames()
  const gangInfo = ns.gang.getGangInformation()

  ns.print(
    renderTable(
      ns,
      [
        [
          "Target Mult",
          ns.formatNumber(TARGET_ASC_MULT, 1),
          "Territory",
          ns.formatPercent(gangInfo.territory, 1),
          "Power",
          ns.formatNumber(gangInfo.power, 2),
          "Clash Chance",
          ns.formatPercent(gangInfo.territoryClashChance, 1),
          "Warfare Enabled",
          gangInfo.territoryWarfareEngaged ? "Y" : "N",
        ],
      ],
      false,
    ),
  )

  ns.print("\n")

  const table: RawTableData = [
    [
      "Name",
      "Task",
      "Equip",
      "Hack",
      "Str",
      "Def",
      "Dex",
      "Agi",
      "Cha",
      "Ascension %",
      "Hack ×",
      "Str ×",
      "Def ×",
      "Dex ×",
      "Agi ×",
      "Cha ×",
    ],
  ]
  for (const member of members) {
    const info = ns.gang.getMemberInformation(member)

    const task = getMemberTask(ns, info.name)

    const highestMult = Math.max(1, ...Object.values(getAscensionMultMods(ns, info)))
    table.push([
      info.name,
      task,
      `${info.upgrades.length + info.augmentations.length}/${ns.gang.getEquipmentNames().length}`,
      ns.formatNumber(info.hack, 0),
      ns.formatNumber(info.str, 0),
      ns.formatNumber(info.def, 0),
      ns.formatNumber(info.dex, 0),
      ns.formatNumber(info.agi, 0),
      ns.formatNumber(info.cha, 0),
      renderProgress({ min: 1, max: TARGET_ASC_MULT_MOD, value: highestMult, width: 12 }),
      ns.formatNumber(info.hack_asc_mult, 1),
      ns.formatNumber(info.str_asc_mult, 1),
      ns.formatNumber(info.def_asc_mult, 1),
      ns.formatNumber(info.dex_asc_mult, 1),
      ns.formatNumber(info.agi_asc_mult, 1),
      ns.formatNumber(info.cha_asc_mult, 1),
    ])
  }

  ns.print(renderTable(ns, table))
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")
  ns.disableLog("gang.ascendMember")
  ns.disableLog("gang.setMemberTask")
  ns.disableLog("gang.purchaseEquipment")

  if (!ns.gang.inGang()) {
    ns.tprint("Exited, player is not in a gang")
    return
  }

  while (true) {
    if (ns.gang.canRecruitMember()) {
      let i = 0
      while (!ns.gang.recruitMember("gang-" + i)) {
        i++
      }
    }

    const info = getMemberInfo(ns)
    for (const member of info) {
      if (ns.getPlayer().money > 1_000_000_000) {
        upgradeMemberEquipment(ns, member.info)
      }

      switch (member.task) {
        case GangAction.Ascend:
          ns.gang.ascendMember(member.info.name)
          break
        case GangAction.HumanTrafficking:
        case GangAction.MoneyLaundering:
        case GangAction.TerritoryWarfare:
        case GangAction.TrainCharisma:
        case GangAction.TrainCombat:
        case GangAction.TrainHacking:
          ns.gang.setMemberTask(member.info.name, member.task)
          break
      }
    }

    ns.clearLog()
    printStatus(ns)
    await ns.asleep(1000)
  }
}
