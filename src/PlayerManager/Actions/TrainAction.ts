import { City, LocationName } from "/data/LocationNames"
import { CONSTANTS } from "/game-constants"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import { Attribute, CityLocationMap } from "/lib/objects"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class TrainAction extends BaseAction {
  protected attribute: Attribute
  protected minLevel: number

  UNI_MAP: CityLocationMap = {
    [City.Sector12]: LocationName.Sector12RothmanUniversity,
    [City.Volhaven]: LocationName.VolhavenZBInstituteOfTechnology,
    [City.Aevum]: LocationName.AevumSummitUniversity,
  }

  GYM_MAP: CityLocationMap = {
    [City.Sector12]: LocationName.Sector12PowerhouseGym,
    [City.Volhaven]: LocationName.VolhavenMilleniumFitnessGym,
    [City.Aevum]: LocationName.AevumSnapFitnessGym,
  }

  BEST_UNI_CITY = City.Volhaven
  BEST_GYM_CITY = City.Sector12

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

  getExpPerSec(): number {
    switch (this.attribute) {
      case Attribute.CHARISMA:
      case Attribute.HACKING:
        return 8
      case Attribute.STRENGTH:
      case Attribute.DEFENSE:
      case Attribute.AGILITY:
      case Attribute.DEXTERITY:
        return 7.5
    }
  }

  shouldPerform(ns: NS): boolean {
    const player = ns.getPlayer()
    const nextLevelExp = ns.formulas.skills.calculateExp(player[this.attribute], player[`${this.attribute}_mult`])
    const nextLevelExpRemaining = nextLevelExp - player[`${this.attribute}_exp`]
    const timeForLevel = nextLevelExpRemaining / (this.getExpPerSec() * player[`${this.attribute}_exp_mult`])

    return ns.getPlayer()[this.attribute] < this.minLevel && timeForLevel < 60
  }

  isPerforming(ns: NS): boolean {
    const player = ns.getPlayer()
    const action = getPlayerAction(ns)

    switch (this.attribute) {
      case Attribute.CHARISMA:
        return (
          action.type === PlayerActionType.Study &&
          action.uni === this.UNI_MAP[player.city] &&
          action.course.includes(CONSTANTS.ClassLeadership)
        )
      case Attribute.HACKING:
        return (
          action.type === PlayerActionType.Study &&
          action.uni === this.UNI_MAP[player.city] &&
          action.course === this.getCourseName()
        )
      case Attribute.STRENGTH:
      case Attribute.DEFENSE:
      case Attribute.AGILITY:
      case Attribute.DEXTERITY:
        return (
          action.type === PlayerActionType.Exercise &&
          action.gym === this.GYM_MAP[player.city] &&
          action.exercise === this.getCourseName()
        )
    }
  }

  async perform(ns: NS): Promise<boolean> {
    const player = ns.getPlayer()

    const shouldFocus = !ns.getOwnedAugmentations().includes("Neuroreceptor Management Implant")

    switch (this.attribute) {
      case Attribute.CHARISMA:
      case Attribute.HACKING: {
        const uniName =
          player.city !== this.BEST_UNI_CITY && !ns.travelToCity(this.BEST_UNI_CITY)
            ? this.UNI_MAP[player.city]
            : this.UNI_MAP[this.BEST_UNI_CITY]

        if (!uniName) {
          return false
        }

        return ns.universityCourse(uniName, this.getCourseName(), shouldFocus)
      }
      case Attribute.STRENGTH:
      case Attribute.DEFENSE:
      case Attribute.AGILITY:
      case Attribute.DEXTERITY: {
        const gymName =
          player.city !== this.BEST_GYM_CITY && !ns.travelToCity(this.BEST_GYM_CITY)
            ? this.GYM_MAP[player.city]
            : this.GYM_MAP[this.BEST_GYM_CITY]

        if (!gymName) {
          return false
        }

        return ns.gymWorkout(gymName, this.getCourseName(), shouldFocus)
      }
    }
  }

  getCourseName(): string {
    switch (this.attribute) {
      case "strength":
        return CONSTANTS.ClassGymStrength
      case "defense":
        return CONSTANTS.ClassGymDefense
      case "dexterity":
        return CONSTANTS.ClassGymDexterity
      case "agility":
        return CONSTANTS.ClassGymAgility
      case "charisma":
        return "Leadership"
      case "hacking":
        return "Algorithms"
      default:
        throw new Error("Unknown attribute: " + this.attribute)
    }
  }

  toString(): string {
    return `<${this.constructor.name} attribute=${this.attribute}>`
  }
}
