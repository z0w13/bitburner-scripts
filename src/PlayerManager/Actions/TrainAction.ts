import { CONSTANTS } from "/game-constants"
import { Attribute } from "/lib/objects"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class TrainAction extends BaseAction {
  protected attribute: Attribute
  protected minLevel: number

  UNI_MAP: Record<string, string> = {
    "Sector-12": "Rothman University",
    Volhaven: "ZB Institute of Technology",
    Aevum: "Summit University",
  }

  GYM_MAP: Record<string, string> = {
    "Sector-12": "Powerhouse Gym",
    Volhaven: "Millenium Fitness Gym",
    Aevum: "Snap Fitness Gym",
  }

  BEST_UNI_CITY = "Volhaven"
  BEST_GYM_CITY = "Sector-12"

  constructor(attribute: Attribute, minLevel = 10) {
    super()

    this.attribute = attribute
    this.minLevel = minLevel
  }

  setMinLevel(lvl: number): void {
    this.minLevel = lvl
  }

  getAttribute(): Attribute {
    return this.attribute
  }

  shouldPerform(ns: NS): boolean {
    return ns.getPlayer()[this.attribute] < this.minLevel
  }

  isPerforming(ns: NS): boolean {
    const player = ns.getPlayer()

    switch (this.attribute) {
      case Attribute.CHARISMA:
        return (
          player.workType === CONSTANTS.WorkTypeStudyClass &&
          player.location === this.UNI_MAP[player.city] &&
          player.className.includes(CONSTANTS.ClassLeadership)
        )
      case Attribute.HACKING:
        return (
          player.workType === CONSTANTS.WorkTypeStudyClass &&
          player.location === this.UNI_MAP[player.city] &&
          player.className.includes(CONSTANTS.ClassAlgorithms)
        )
      case Attribute.STRENGTH:
      case Attribute.DEFENSE:
      case Attribute.AGILITY:
      case Attribute.DEXTERITY:
        return (
          player.workType === CONSTANTS.WorkTypeStudyClass &&
          player.location === this.GYM_MAP[player.city] &&
          player.className.toLowerCase().includes(this.attribute.toLowerCase())
        )
    }
  }

  perform(ns: NS): boolean {
    const player = ns.getPlayer()

    switch (this.attribute) {
      case Attribute.CHARISMA:
      case Attribute.HACKING: {
        const uniName =
          player.city !== this.BEST_UNI_CITY && !ns.travelToCity(this.BEST_UNI_CITY)
            ? this.UNI_MAP[player.city]
            : this.UNI_MAP[this.BEST_UNI_CITY]

        return ns.universityCourse(uniName, this.getType(), false)
      }
      case Attribute.STRENGTH:
      case Attribute.DEFENSE:
      case Attribute.AGILITY:
      case Attribute.DEXTERITY: {
        const gymName =
          player.city !== this.BEST_GYM_CITY && !ns.travelToCity(this.BEST_GYM_CITY)
            ? this.GYM_MAP[player.city]
            : this.GYM_MAP[this.BEST_GYM_CITY]

        return ns.gymWorkout(gymName, this.getType(), false)
      }
    }
  }

  getType(): ActionType {
    switch (this.attribute) {
      case "strength":
        return ActionType.TRAIN_STRENGTH
      case "defense":
        return ActionType.TRAIN_DEFENSE
      case "dexterity":
        return ActionType.TRAIN_DEXTERITY
      case "agility":
        return ActionType.TRAIN_AGILITY
      case "charisma":
        return ActionType.TRAIN_CHARISMA
      case "hacking":
        return ActionType.TRAIN_HACKING
      default:
        return ActionType.IDLE
    }
  }
}
