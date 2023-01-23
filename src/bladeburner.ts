import type { NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import { formatMoney, formatNum } from "/lib/util"
import BladeburnerAction, { getCityPops, getMoneyBeforeOps } from "PlayerManager/Actions/BladeburnerPerformAction"
import BladeburnerLevelSkillAction from "/PlayerManager/Actions/BladeburnerLevelSkillAction"
import { ActionType, BlackOp } from "/data/Bladeburner"

function printStatus(ns: NS): void {
  const currentAction = ns.bladeburner.getCurrentAction()
  const city = ns.bladeburner.getCity()
  const [curStam, maxStam] = ns.bladeburner.getStamina()

  const totalBlackOps = Object.values(BlackOp).length
  const finishedBlackOps = Object.values(BlackOp).filter(
    (b) => ns.bladeburner.getActionCountRemaining(ActionType.BlackOp, b) === 0,
  ).length

  const tableData: RawTableData = [
    ["Rank", formatNum(ns, ns.bladeburner.getRank())],
    ["BlackOps Progress", `${finishedBlackOps}/${totalBlackOps}`],
    [],
    ["Type", currentAction.type],
    ["Action", currentAction.name],
    ["Action Level", ns.bladeburner.getActionCurrentLevel(currentAction.type, currentAction.name)],
    [],
    ["Stamina", `${formatNum(ns, curStam)}/${formatNum(ns, maxStam)}`],
    ["Skill Points", ns.bladeburner.getSkillPoints()],
    ["Money Before Ops", formatMoney(ns, getMoneyBeforeOps(ns))],
    [],
    ["City", city],
    ["Pop", formatNum(ns, ns.bladeburner.getCityEstimatedPopulation(city), "0,0.00a")],
    ["Chaos", formatNum(ns, ns.bladeburner.getCityChaos(city))],
  ]

  ns.clearLog()
  ns.print(renderTable(ns, tableData, false))

  const popData: RawTableData = [["City", "Pop"]]
  popData.push(...Object.entries(getCityPops(ns)).map(([city, pop]) => [city, formatNum(ns, pop, "0,0.00a")]))

  ns.print(renderTable(ns, popData))
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const action = new BladeburnerAction()
  const levelAction = new BladeburnerLevelSkillAction()

  while (true) {
    if (!action.isPerforming(ns)) {
      await action.perform(ns)
    }

    if (levelAction.shouldPerform(ns)) {
      await levelAction.perform(ns)
    }

    printStatus(ns)
    await ns.asleep(5000)
  }
}
