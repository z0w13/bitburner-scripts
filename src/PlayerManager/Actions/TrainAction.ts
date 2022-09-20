import { City, LocationName } from "/data/LocationNames"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import { Attribute, CityLocationMap } from "/lib/objects"
import BaseAction from "/PlayerManager/Actions/BaseAction"

const UNI_MAP: CityLocationMap = {
  [City.Sector12]: LocationName.Sector12RothmanUniversity,
  [City.Volhaven]: LocationName.VolhavenZBInstituteOfTechnology,
  [City.Aevum]: LocationName.AevumSummitUniversity,
}

const GYM_MAP: CityLocationMap = {
  [City.Sector12]: LocationName.Sector12PowerhouseGym,
  [City.Volhaven]: LocationName.VolhavenMilleniumFitnessGym,
  [City.Aevum]: LocationName.AevumSnapFitnessGym,
}

const BEST_UNI_CITY = City.Volhaven
const BEST_GYM_CITY = City.Sector12

function getExpPerSec(attr: Attribute): number {
  switch (attr) {
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

function getCourseName(attr: Attribute): string {
  switch (attr) {
    case "strength":
    case "defense":
    case "dexterity":
    case "agility":
      return attr
    case "charisma":
      return "Leadership"
    case "hacking":
      return "Algorithms"
    default:
      throw new Error("Unknown attribute: " + attr)
  }
}

function getTrainingCity(ns: NS, attr: Attribute): LocationName | undefined {
  const player = ns.getPlayer()

  switch (attr) {
    case Attribute.CHARISMA:
    case Attribute.HACKING:
      return player.city !== BEST_UNI_CITY && player.money < 200_000
        ? UNI_MAP[player.city as City]
        : UNI_MAP[BEST_UNI_CITY]
    case Attribute.STRENGTH:
    case Attribute.DEFENSE:
    case Attribute.AGILITY:
    case Attribute.DEXTERITY:
      return player.city !== BEST_GYM_CITY && player.money < 200_000
        ? GYM_MAP[player.city as City]
        : GYM_MAP[BEST_GYM_CITY]
  }
}

export function shouldTrain(ns: NS, attr: Attribute, targetLevel: number): boolean {
  const player = ns.getPlayer()
  const nextLevelExp = ns.formulas.skills.calculateExp(player.skills[attr], player.mults[attr])
  const nextLevelExpRemaining = nextLevelExp - player.exp[attr]
  const timeForLevel = nextLevelExpRemaining / (getExpPerSec(attr) * player.mults[`${attr}_exp`])

  return player.skills[attr] < targetLevel && timeForLevel < 60 && !!getTrainingCity(ns, attr)
}

export function isTraining(ns: NS, attr: Attribute): boolean {
  const action = getPlayerAction(ns)
  const course = getCourseName(attr)

  switch (attr) {
    case Attribute.CHARISMA:
    case Attribute.HACKING:
      return action.type === PlayerActionType.Study && action.course.toUpperCase().includes(course.toUpperCase())
    case Attribute.STRENGTH:
    case Attribute.DEFENSE:
    case Attribute.AGILITY:
    case Attribute.DEXTERITY:
      return action.type === PlayerActionType.Exercise && action.exercise.toUpperCase().includes(course.toUpperCase())
  }
}

export async function train(ns: NS, attr: Attribute): Promise<boolean> {
  const player = ns.getPlayer()

  const shouldFocus = !ns.singularity.getOwnedAugmentations().includes("Neuroreceptor Management Implant")

  switch (attr) {
    case Attribute.CHARISMA:
    case Attribute.HACKING: {
      const uniName =
        player.city !== BEST_UNI_CITY && !ns.singularity.travelToCity(BEST_UNI_CITY)
          ? UNI_MAP[player.city as City]
          : UNI_MAP[BEST_UNI_CITY]

      if (!uniName) {
        return false
      }

      return ns.singularity.universityCourse(uniName, getCourseName(attr), shouldFocus)
    }
    case Attribute.STRENGTH:
    case Attribute.DEFENSE:
    case Attribute.AGILITY:
    case Attribute.DEXTERITY: {
      const gymName =
        player.city !== BEST_GYM_CITY && !ns.singularity.travelToCity(BEST_GYM_CITY)
          ? GYM_MAP[player.city as City]
          : GYM_MAP[BEST_GYM_CITY]

      if (!gymName) {
        return false
      }

      return ns.singularity.gymWorkout(gymName, getCourseName(attr), shouldFocus)
    }
  }
}

export default class TrainAction extends BaseAction {
  protected attribute: Attribute
  protected minLevel: number

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
    return shouldTrain(ns, this.attribute, this.minLevel)
  }

  isPerforming(ns: NS): boolean {
    return isTraining(ns, this.attribute)
  }

  async perform(ns: NS): Promise<boolean> {
    return train(ns, this.attribute)
  }

  toString(): string {
    return `<${this.constructor.name} attribute=${this.attribute} level=${this.minLevel}>`
  }
}
