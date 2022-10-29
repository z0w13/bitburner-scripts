import { NS } from "@ns"
import { Skill } from "/data/Bladeburner"
import { sortFunc } from "/lib/util"
import BaseAction from "/PlayerManager/Actions/BaseAction"

const SKILLS_TO_LEVEL: Record<string, number | null> = {
  [Skill.BladesIntuition]: null,
  [Skill.Cloak]: 30,
  [Skill.ShortCircuit]: 30,
  [Skill.DigitalObserver]: null,
  [Skill.Tracer]: 30,
  [Skill.Overclock]: 90,
  [Skill.Reaper]: null,
  [Skill.EvasiveSystem]: null,
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

function levelSkill(ns: NS): boolean {
  const skill = getSkillToLevel(ns)
  if (!skill) {
    return false
  }

  return ns.bladeburner.upgradeSkill(skill)
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
