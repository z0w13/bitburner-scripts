import type { NS } from "@ns"
import { Skill } from "/data/Bladeburner"
import { sortFunc } from "/lib/util"
import BaseAction from "/PlayerManager/Actions/BaseAction"

const SKILLS_TO_LEVEL: Record<string, number | null> = {
  [Skill.BladesIntuition]: 5000,
  [Skill.Cloak]: 30,
  [Skill.ShortCircuit]: 30,
  [Skill.DigitalObserver]: 5000,
  [Skill.Tracer]: 30,
  [Skill.Overclock]: 90,
  [Skill.Reaper]: 5000,
  [Skill.EvasiveSystem]: 5000,
  [Skill.HandsofMidas]: null,
  [Skill.Hyperdrive]: 30,
}

function getSkillToLevel(ns: NS): string | undefined {
  const skill = Object.entries(SKILLS_TO_LEVEL)
    .filter(([skill, maxLevel]) => !maxLevel || ns.bladeburner.getSkillLevel(skill) < maxLevel)
    .filter(([skill, _maxLevel]) => ns.bladeburner.getSkillUpgradeCost(skill, 1) <= ns.bladeburner.getSkillPoints())
    .sort(sortFunc(([skill, _maxLevel]) => ns.bladeburner.getSkillLevel(skill)))
    .at(0)

  return skill ? skill[0] : undefined
}

function getAffordableUpgradeCount(ns: NS, skill: string): number {
  const maxLevel = SKILLS_TO_LEVEL[skill]
  const currentLevel = ns.bladeburner.getSkillLevel(skill)

  // If invalid skill
  if (currentLevel === -1) {
    throw new Error(`${skill} is not a valid bladeburner skill`)
  }

  let upgradeCount = 0
  do {
    upgradeCount += 1
  } while (
    ns.bladeburner.getSkillUpgradeCost(skill, upgradeCount) < ns.bladeburner.getSkillPoints() &&
    (!maxLevel || currentLevel + upgradeCount <= maxLevel)
  )

  return upgradeCount
}

function levelSkill(ns: NS): boolean {
  const skill = getSkillToLevel(ns)
  if (!skill) {
    return false
  }

  const upgradeCount = getAffordableUpgradeCount(ns, skill)
  if (upgradeCount === 0) {
    throw new Error(`${skill} has 0 affordable levels, this shouldn't happen`)
  }

  const success = ns.bladeburner.upgradeSkill(skill, upgradeCount)

  if (success) {
    ns.toast(`BB: Upgraded ${skill} to level ${ns.bladeburner.getSkillLevel(skill)}`)
  }

  return success
}

export default class BladeburnerLevelSkillAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return !!getSkillToLevel(ns)
  }

  async perform(ns: NS): Promise<boolean> {
    return levelSkill(ns)
  }

  isBackground(_ns: NS): boolean {
    return true
  }
}
