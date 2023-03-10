import type { GangMemberAscension, GangMemberInfo, GangTaskStats, NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import { renderProgress, sortFunc } from "/lib/util"

type StatType = "hack" | "str" | "dex" | "def" | "agi" | "cha"
type Stats = Record<StatType, number>

const TARGET_ASC_MULT = 10
const TARGET_ASC_MULT_MOD = 1.05 // 5% increase of current multiplier
const TARGET_ATTRIB_MULT = TARGET_ASC_MULT * 10
const TARGET_TERRITORY = 1
const MAX_GANG_MEMBERS = 8
const WANTED_MULTIPLIER_BEFORE_VIGILANTE = 0.8
const MEMBER_NAMES: Array<string> = [
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Epsilon",
  "Zeta",
  "Kappa",
  "Lambda",
  "Omicron",
  "Sigma",
]

enum GangAction {
  Ascend = "Ascend",

  TrainHacking = "Train Hacking",
  TrainCombat = "Train Combat",
  TrainCharisma = "Train Charisma",

  TerritoryWarfare = "Territory Warfare",
  HumanTrafficking = "Human Trafficking",
  MoneyLaundering = "Money Laundering",
  VigilanteJustice = "Vigilante Justice",
  MugPeople = "Mug People",
}

type GangTrainAction = GangAction.TrainHacking | GangAction.TrainCombat | GangAction.TrainCharisma

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
    const playerMoney = ns.getPlayer().money
    const equipCost = ns.gang.getEquipmentCost(equip)
    const equipCostThreshold = playerMoney > 1_000_000_000 ? equipCost : equipCost * 10

    if (equipCostThreshold < ns.getPlayer().money) {
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

function getTaskAttribReqs(task: GangTaskStats): Stats {
  return {
    hack: task.hackWeight * task.difficulty,
    str: task.strWeight * task.difficulty,
    dex: task.dexWeight * task.difficulty,
    def: task.defWeight * task.difficulty,
    agi: task.agiWeight * task.difficulty,
    cha: task.chaWeight * task.difficulty,
  }
}

function taskMeetsAttribReqs(member: GangMemberInfo, task: GangTaskStats): boolean {
  const attribReqs = getTaskAttribReqs(task)

  return (
    member.hack >= attribReqs.hack &&
    member.str > attribReqs.str &&
    member.dex > attribReqs.dex &&
    member.def > attribReqs.def &&
    member.agi > attribReqs.agi &&
    member.cha > attribReqs.cha
  )
}

function getRespectTasks(ns: NS): Array<GangTaskStats> {
  return ns.gang
    .getTaskNames()
    .map((n) => ns.gang.getTaskStats(n))
    .filter((t) => t.baseRespect > 0)
    .sort(sortFunc((t) => t.baseRespect))
}

function getBestRespectTask(ns: NS, member: GangMemberInfo): GangAction | undefined {
  const tasks = getRespectTasks(ns)
  return (tasks.at(ns.gang.getMemberNames().length - 1)?.name ?? tasks.at(-1)?.name) as GangAction | undefined
}

function getLowestStatCategory(member: GangMemberInfo): GangTrainAction {
  const lowestAttr = dictGetLowest({
    hack: member.hack,
    str: member.str,
    def: member.def,
    dex: member.dex,
    agi: member.agi,
    cha: member.cha,
  }) as StatType

  switch (lowestAttr) {
    case "hack":
      return GangAction.TrainHacking
    case "cha":
      return GangAction.TrainCharisma
    case "str":
    case "def":
    case "dex":
    case "agi":
      return GangAction.TrainCombat
  }
}

function getMemberTask(ns: NS, name: string): GangAction {
  const info = ns.gang.getMemberInformation(name)
  const gangInfo = ns.gang.getGangInformation()
  const goalStats = getGoalStats(info)
  const numEquipment = ns.gang.getEquipmentNames().length

  if (shouldAscend(ns, info)) {
    return GangAction.Ascend
  }

  if (gangInfo.wantedPenalty < WANTED_MULTIPLIER_BEFORE_VIGILANTE && gangInfo.respect > 1 && gangInfo.wantedLevel > 2) {
    if (taskMeetsAttribReqs(info, ns.gang.getTaskStats(GangAction.VigilanteJustice))) {
      return GangAction.VigilanteJustice
    } else {
      return getLowestStatCategory(info)
    }
  }

  if (ns.gang.getMemberNames().length < MAX_GANG_MEMBERS) {
    const bestRespectTask = getBestRespectTask(ns, info)
    if (bestRespectTask && taskMeetsAttribReqs(info, ns.gang.getTaskStats(bestRespectTask))) {
      return bestRespectTask
    } else {
      return getLowestStatCategory(info)
    }
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

  if (shouldEngageInTerritoryWarfare(info, numEquipment, ns.gang.getGangInformation().territory)) {
    return GangAction.TerritoryWarfare
  } else {
    // TODO(zowie): Select task based on stats
    return ns.gang.getGangInformation().isHacking ? GangAction.MoneyLaundering : GangAction.HumanTrafficking
  }
}

function shouldEngageInTerritoryWarfare(info: GangMemberInfo, numEquipment: number, territory: number): boolean {
  return info.upgrades.length + info.augmentations.length >= numEquipment - 2 || territory < TARGET_TERRITORY
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

  ns.print(
    renderTable(
      ns,
      [
        [
          "Members",
          members.length,
          "Respect",
          ns.formatNumber(gangInfo.respect, 2),
          "Wanted Level",
          ns.formatNumber(gangInfo.wantedLevel, 2),
          "Wanted Penalty",
          ns.formatPercent(1 - gangInfo.wantedPenalty, 2),
        ],
      ],
      false,
    )
      .split("\n")
      .slice(1)
      .join("\n"),
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

    const highestMult = Math.max(1, ...Object.values(getAscensionMultMods(ns, info)))
    table.push([
      info.name,
      info.task,
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

/**
 * 1. Get enough respect for more members
 * 2. Recruit max members
 * 3. Train up till target
 * 4. Territory warfare till 100%
 * 5. Make money
 */

function manageMember(ns: NS, member: GangMember): void {
  upgradeMemberEquipment(ns, member.info)

  switch (member.task) {
    case GangAction.Ascend:
      ns.gang.ascendMember(member.info.name)
      break
    default:
      ns.gang.setMemberTask(member.info.name, member.task)
      break
  }
}

function printTaskReqs(ns: NS): void {
  const respectTasks = getRespectTasks(ns)
  const tableData: RawTableData = [["Name", "Hack", "Str", "Def", "Dex", "Agi", "Cha", "Base Respect", "Terr Respect"]]

  for (const task of respectTasks) {
    const taskReqs = getTaskAttribReqs(task)
    tableData.push([
      task.name,
      taskReqs.hack,
      taskReqs.str,
      taskReqs.def,
      taskReqs.dex,
      taskReqs.agi,
      taskReqs.cha,
      task.baseRespect,
      task.territory.respect,
    ])
  }

  ns.print(renderTable(ns, tableData))
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
      ns.gang.recruitMember(MEMBER_NAMES[ns.gang.getMemberNames().length - 1])
    }

    getMemberInfo(ns).forEach((member) => manageMember(ns, member))

    ns.clearLog()
    printStatus(ns)

    await ns.asleep(1000)
  }
}
