import { NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import setupPolyfill from "/lib/ns-polyfill"
import { formatMoney, formatNum } from "/lib/util"
import BladeburnerAction, { getMoneyBeforeOps } from "/PlayerManager/Actions/BladeburnerAction"
import BladeburnerLevelSkillAction from "/PlayerManager/Actions/BladeburnerLevelSkillAction"

function printStatus(ns: NS): void {
  const currentAction = ns.bladeburner.getCurrentAction()
  const city = ns.bladeburner.getCity()
  const [curStam, maxStam] = ns.bladeburner.getStamina()

  const tableData: RawTableData = [
    ["Rank", formatNum(ns, ns.bladeburner.getRank())],
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
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)
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
