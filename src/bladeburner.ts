import type { NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import { formatTime } from "/lib/util"
import BladeburnerAction, {
  getCityPops,
  getFinishedBlackOps,
  getTotalBlackOps,
  getTotalContractSuccesses,
  getTotalOpSuccesses,
} from "PlayerManager/Actions/BladeburnerPerformAction"
import BladeburnerLevelSkillAction from "/PlayerManager/Actions/BladeburnerLevelSkillAction"
import { ActionType } from "/data/Bladeburner"

function abbreviateAction(actionName: string): string {
  switch (actionName) {
    case "Stealth Retirement Operation":
      return "Stealth Retirement"
    case "Hyperbolic Regeneration Chamber":
      return "Regen Chamber"
    default:
      return actionName
  }
}

function formatSuccess(ns: NS, success: [number, number]): string {
  if (success[0] === success[1]) {
    return ns.formatPercent(success[0], 1)
  }

  return `${ns.formatPercent(success[0], 1)} - ${ns.formatPercent(success[1], 1)}`
}

function printStatus(ns: NS): void {
  const currentAction = ns.bladeburner.getCurrentAction()
  const city = ns.bladeburner.getCity()
  const [curStam, maxStam] = ns.bladeburner.getStamina()

  const actionLevel =
    currentAction.type !== ActionType.Idle
      ? ns.bladeburner.getActionCurrentLevel(currentAction.type, currentAction.name)
      : null

  const successChance =
    currentAction.type !== ActionType.Idle
      ? ns.bladeburner.getActionEstimatedSuccessChance(currentAction.type, currentAction.name)
      : ([100, 100] as [number, number])

  const tableData: RawTableData = [
    ["Rank", ns.formatNumber(ns.bladeburner.getRank(), 0)],
    ["BlackOps", `${getFinishedBlackOps(ns)}/${getTotalBlackOps()}`],
    ["Bonus Time", ns.bladeburner.getBonusTime() > 5_000 ? ns.tFormat(ns.bladeburner.getBonusTime()) : "0"],
    [],
    ["Type", currentAction.type],
    [
      "Action",
      abbreviateAction(currentAction.name) + (currentAction.type !== ActionType.General ? ` Lv. ${actionLevel}` : ""),
    ],
    ["Success %", formatSuccess(ns, successChance)],
    ["Time", formatTime(ns.bladeburner.getActionTime(currentAction.type, currentAction.name))],
    [],
    ["Contract ✓", ns.formatNumber(getTotalContractSuccesses(ns), 0, 100_000)],
    ["Op ✓", ns.formatNumber(getTotalOpSuccesses(ns), 0, 100_000)],
    [],
    ["Stamina", ns.formatPercent(curStam / maxStam, 1)],
    ["Skill Points", ns.formatNumber(ns.bladeburner.getSkillPoints(), 0)],
    [],
    ["City", city],
    ["Pop", ns.formatNumber(ns.bladeburner.getCityEstimatedPopulation(city), 2)],
    ["Chaos", ns.formatNumber(ns.bladeburner.getCityChaos(city))],
  ]

  ns.print(renderTable(tableData, false))

  const popData: RawTableData = [["City", "Pop"]]
  popData.push(...Object.entries(getCityPops(ns)).map(([city, pop]) => [city, ns.formatNumber(pop, 2)]))

  ns.print(renderTable(popData))
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const action = new BladeburnerAction()
  const levelAction = new BladeburnerLevelSkillAction()

  while (true) {
    if (action.shouldPerform(ns) && !action.isPerforming(ns)) {
      await action.perform(ns)
    }

    if (levelAction.shouldPerform(ns)) {
      await levelAction.perform(ns)
    }

    ns.clearLog()
    printStatus(ns)
    await ns.asleep(1000)
  }
}
