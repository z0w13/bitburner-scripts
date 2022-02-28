import { NS, GangMemberInfo, GangMemberAscension } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"

function ascFromMember(member: GangMemberInfo): GangMemberAscension {
  return {
    respect: -member.earnedRespect,
    hack: member.hack_asc_mult,
    str: member.str_asc_mult,
    def: member.def_asc_mult,
    agi: member.agi_asc_mult,
    dex: member.dex_asc_mult,
    cha: member.cha_asc_mult,
  }
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("asleep")
  ns.disableLog("gang.ascendMember")
  ns.disableLog("gang.setMemberTask")

  while (true) {
    if (ns.gang.canRecruitMember()) {
      let i = 0
      while (!ns.gang.recruitMember("gang-" + i)) {
        i++
      }
    }

    const members = ns.gang.getMemberNames()
    for (const member of members) {
      const info = ns.gang.getMemberInformation(member)
      const currAsc = ascFromMember(info)
      if (info.task.indexOf("Train") === -1 && info.task !== "Unassigned") {
        continue
      }

      const asc = ns.gang.getAscensionResult(member)
      if (!asc) {
        continue
      }

      type GangMemberAscAttribute = keyof Omit<GangMemberAscension, "respect">
      const attribs: Array<GangMemberAscAttribute> = ["hack", "str", "def", "agi", "dex", "cha"]

      let lowestVal = Infinity
      let lowestAttr: GangMemberAscAttribute = "str"
      for (const attrib of attribs) {
        const currentMult = currAsc[attrib]
        if (currentMult * asc[attrib] - currentMult > 0.5) {
          ns.print(`${member} ${attrib} growth is ${currentMult * asc[attrib] - currentMult}`)
          ns.gang.ascendMember(member)
          break
        }

        if (currAsc[attrib] < lowestVal) {
          lowestVal = currAsc[attrib]
          lowestAttr = attrib
        }
      }

      let task = "Train Combat"
      switch (lowestAttr) {
        case "str":
        case "def":
        case "agi":
        case "dex":
          task = "Train Combat"
          break
        case "hack":
          task = "Train Hacking"
          break
        case "cha":
          task = "Train Charisma"
          break
      }

      if (info.task !== task) {
        ns.print(`${member} lowest attr ${lowestAttr} ${lowestVal} switching to ${task}`)
        ns.gang.setMemberTask(member, task)
      }
    }

    await ns.asleep(1000)
  }
}
