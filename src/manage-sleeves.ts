import { NS, SleeveTask } from "@ns"
import { FactionWorkType } from "/data/StaticDefs"
import renderTable, { RawTableData } from "/lib/func/render-table"
import { formatTime } from "/lib/util"
import BuySleeveAugmentsAction from "/PlayerManager/Actions/BuySleeveAugmentsAction"

function getSleeveTask(task: SleeveTask | null): string {
  if (!task) {
    return "Idle"
  }

  switch (task.type) {
    case "BLADEBURNER":
      return `BB - ${task.actionName}`
    case "CLASS":
      return task.classType
    case "COMPANY":
      return `Working for ${task.companyName}`
    case "CRIME":
      return task.crimeType
    case "FACTION":
      switch (task.factionWorkType) {
        case FactionWorkType.field:
          return `Faction - Field Work - ${task.factionName}`
        case FactionWorkType.hacking:
          return `Faction - Hacking Contracts - ${task.factionName}`
        case FactionWorkType.security:
          return `Faction - Security Work - ${task.factionName}`
        default:
          throw new Error(`Unknown faction work type: ${task.factionWorkType}`)
      }
    case "INFILTRATE":
      return "BB - Infiltrate Synthoids"
    case "RECOVERY":
      return "Recovering"
    case "SUPPORT":
      return "BB - Supporting Main Sleeve"
    case "SYNCHRO":
      return "Synchronising"
  }
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")

  const action = new BuySleeveAugmentsAction()

  while (true) {
    if (action.shouldPerform(ns)) {
      await action.perform(ns)
    }

    const tableData: RawTableData = [["Sleeve", "City", "Augments", "Bonus Time", "Action"]]
    const totalSleeves = ns.sleeve.getNumSleeves()

    for (let i = 0; i < totalSleeves; i++) {
      const sleeveInfo = ns.sleeve.getSleeve(i)
      const sleeveAugs = ns.sleeve.getSleeveAugmentations(i).length
      const totalAugs = ns.sleeve.getSleevePurchasableAugs(i).length + sleeveAugs
      const action = ns.sleeve.getTask(i)

      tableData.push([
        i,
        sleeveInfo.city,
        `${sleeveAugs}/${totalAugs}`,
        formatTime(sleeveInfo.storedCycles * 200),
        getSleeveTask(action),
      ])
    }

    ns.clearLog()
    ns.print(renderTable(tableData))

    await ns.asleep(1000)
  }
}
