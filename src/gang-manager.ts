import { NS } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"

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

      if (info.upgrades.length + info.augmentations.length < ns.gang.getEquipmentNames().length) {
        for (const equip of ns.gang.getEquipmentNames()) {
          if (ns.gang.getEquipmentCost(equip) > ns.getPlayer().money) {
            continue
          }
          ns.gang.purchaseEquipment(member, equip)
        }
      }

      let task = "Train Combat"
      if (info.cha < 100 * info.cha_asc_mult) {
        task = "Train Charisma"
      } else if (info.hack < 100 * info.hack_asc_mult) {
        task = "Train Hacking"
      } else if (info.agi < 150 * info.agi_asc_mult) {
        task = "Train Combat"
      } else {
        if (info.upgrades.length + info.augmentations.length < ns.gang.getEquipmentNames().length) {
          // TODO(zowie): Select task based on stats
          task = "Human Trafficking"
        } else {
          task = "Territory Warfare"
        }
      }

      if (info.task !== task) {
        ns.gang.setMemberTask(member, task)
      }
    }

    await ns.asleep(1000)
  }
}
