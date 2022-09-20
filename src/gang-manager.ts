import { GangMemberInfo, NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import setupPolyfill from "/lib/ns-polyfill"
import { formatNum, sortFunc } from "/lib/util"

type StatType = "hack" | "str" | "dex" | "def" | "agi" | "cha"
type Stats = Record<StatType, number>

const TARGET_ASC_MULT = 10
const TARGET_ASC_MULT_MOD = 1.05 // 5% increase of current multiplier
const TARGET_ATTRIB_MULT = 100
const TARGET_TERRITORY = 1

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

function manageMember(ns: NS, info: GangMemberInfo): string {
  const goalStats = getGoalStats(info)
  const numEquipment = ns.gang.getEquipmentNames().length
  if (ns.getPlayer().money > 1_000_000_000) {
    upgradeMemberEquipment(ns, info)
  }

  if (shouldAscend(ns, info)) {
    if (ns.gang.ascendMember(info.name)) {
      return manageMember(ns, ns.gang.getMemberInformation(info.name))
    }
  }

  if (Math.min(...Object.values(getAscensionMults(info))) < TARGET_ASC_MULT) {
    const lowestAsc = dictGetLowest(getAscensionMults(info))
    switch (lowestAsc) {
      case "hack":
        return "Train Hacking"
      case "str":
      case "def":
      case "dex":
      case "agi":
        return "Train Combat"
      case "cha":
        return "Train Charisma"
    }
  }

  upgradeMemberEquipment(ns, info)

  if (info.hack < goalStats.hack) {
    return "Train Hacking"
  } else if (
    info.str < goalStats.str ||
    info.def < goalStats.def ||
    info.dex < goalStats.dex ||
    info.agi < goalStats.agi
  ) {
    return "Train Combat"
  } else if (info.cha < goalStats.cha) {
    return "Train Charisma"
  } else {
    if (
      info.upgrades.length + info.augmentations.length < numEquipment ||
      ns.gang.getGangInformation().territory >= TARGET_TERRITORY
    ) {
      // TODO(zowie): Select task based on stats
      return ns.gang.getGangInformation().isHacking ? "Money Laundering" : "Human Trafficking"
    } else {
      return "Territory Warfare"
    }
  }
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

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("asleep")
  ns.disableLog("gang.ascendMember")
  ns.disableLog("gang.setMemberTask")
  ns.disableLog("gang.purchaseEquipment")

  if (!ns.gang.inGang()) {
    ns.tprint("Exited, player is not in a gang")
    return
  }

  while (true) {
    ns.clearLog()

    if (ns.gang.canRecruitMember()) {
      let i = 0
      while (!ns.gang.recruitMember("gang-" + i)) {
        i++
      }
    }

    const members = ns.gang.getMemberNames()

    const table: RawTableData = [["Name", "Task", "Equip", "Stats", "Target%", "Asc"]]
    for (const member of members) {
      const info = ns.gang.getMemberInformation(member)

      const task = manageMember(ns, info)
      const goalStats = getGoalStats(info)
      const ascMultMod = getAscensionMultMods(ns, info)

      if (info.task !== task) {
        ns.gang.setMemberTask(member, task)
      }

      table.push([
        info.name,
        task,
        `${info.upgrades.length + info.augmentations.length}/${ns.gang.getEquipmentNames().length}`,
        ns.vsprintf("%7s/%7s/%7s/%7s/%7s/%7s", [
          formatNum(ns, info.hack, "0,0"),
          formatNum(ns, info.str, "0,0"),
          formatNum(ns, info.def, "0,0"),
          formatNum(ns, info.dex, "0,0"),
          formatNum(ns, info.agi, "0,0"),
          formatNum(ns, info.cha, "0,0"),
        ]),
        ns.vsprintf("%7s/%7s/%7s/%7s/%7s/%7s", [
          formatNum(ns, Math.min(100, (info.hack / goalStats.hack) * 100)) + "%",
          formatNum(ns, Math.min(100, (info.str / goalStats.str) * 100)) + "%",
          formatNum(ns, Math.min(100, (info.def / goalStats.def) * 100)) + "%",
          formatNum(ns, Math.min(100, (info.dex / goalStats.dex) * 100)) + "%",
          formatNum(ns, Math.min(100, (info.agi / goalStats.agi) * 100)) + "%",
          formatNum(ns, Math.min(100, (info.cha / goalStats.cha) * 100)) + "%",
        ]),
        ns.vsprintf("%6s*%5s/%6s*%5s/%6s*%5s/%6s*%5s/%6s*%5s/%6s*%5s", [
          formatNum(ns, info.hack_asc_mult),
          formatNum(ns, ascMultMod.hack),
          formatNum(ns, info.str_asc_mult),
          formatNum(ns, ascMultMod.str),
          formatNum(ns, info.def_asc_mult),
          formatNum(ns, ascMultMod.def),
          formatNum(ns, info.dex_asc_mult),
          formatNum(ns, ascMultMod.dex),
          formatNum(ns, info.agi_asc_mult),
          formatNum(ns, ascMultMod.agi),
          formatNum(ns, info.cha_asc_mult),
          formatNum(ns, ascMultMod.cha),
        ]),
      ])
    }

    ns.print("Stats: hack/str/def/dex/agi/cha")
    ns.print(renderTable(ns, table))

    await ns.asleep(1000)
  }
}
