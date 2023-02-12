import { GymType, Skills as AllSkills, UniversityClassType } from "@ns"
import { CityName, LocationName } from "/data/StaticDefs"
import getPlayerAction, { PlayerActionType } from "/lib/func/get-player-action"
import { CityLocationMap } from "/lib/objects"
import BaseAction from "/PlayerManager/Actions/BaseAction"

type Skills = keyof Omit<AllSkills, "intelligence">

const UNI_MAP: CityLocationMap = {
  [CityName.Sector12]: LocationName.Sector12RothmanUniversity,
  [CityName.Volhaven]: LocationName.VolhavenZBInstituteOfTechnology,
  [CityName.Aevum]: LocationName.AevumSummitUniversity,
}

const GYM_MAP: CityLocationMap = {
  [CityName.Sector12]: LocationName.Sector12PowerhouseGym,
  [CityName.Volhaven]: LocationName.VolhavenMilleniumFitnessGym,
  [CityName.Aevum]: LocationName.AevumSnapFitnessGym,
}

const BEST_UNI_CITY = CityName.Volhaven
const BEST_GYM_CITY = CityName.Sector12

function getExpPerSec(attr: Skills): number {
  switch (attr) {
    case "charisma":
    case "hacking":
      return 8
    case "strength":
    case "defense":
    case "agility":
    case "dexterity":
      return 7.5
  }
}

function getCourseName(attr: Skills): GymType | UniversityClassType {
  switch (attr) {
    case "strength":
      return "str" as GymType
    case "defense":
      return "def" as GymType
    case "dexterity":
      return "dex" as GymType
    case "agility":
      return "agi" as GymType
    case "charisma":
      return "Leadership" as UniversityClassType
    case "hacking":
      return "Algorithms" as UniversityClassType
    default:
      throw new Error("Unknown attribute: " + attr)
  }
}

function getTrainingCity(ns: NS, attr: Skills): LocationName | undefined {
  const player = ns.getPlayer()

  switch (attr) {
    case "charisma":
    case "hacking":
      return player.city !== BEST_UNI_CITY && player.money < 200_000 ? UNI_MAP[player.city] : UNI_MAP[BEST_UNI_CITY]
    case "strength":
    case "defense":
    case "agility":
    case "dexterity":
      return player.city !== BEST_GYM_CITY && player.money < 200_000 ? GYM_MAP[player.city] : GYM_MAP[BEST_GYM_CITY]
  }
}

export function shouldTrain(ns: NS, attr: Skills, targetLevel: number): boolean {
  const player = ns.getPlayer()
  const nextLevelExp = ns.formulas.skills.calculateExp(player.skills[attr], player.mults[attr])
  const nextLevelExpRemaining = nextLevelExp - player.exp[attr]
  const timeForLevel = nextLevelExpRemaining / (getExpPerSec(attr) * (player.mults[`${attr}_exp`] || 0))

  return player.skills[attr] < targetLevel && timeForLevel < 60 && !!getTrainingCity(ns, attr)
}

export function isTraining(ns: NS, attr: Skills): boolean {
  const action = getPlayerAction(ns)
  const course = getCourseName(attr)

  switch (attr) {
    case "charisma":
    case "hacking":
      return action.type === PlayerActionType.Study && action.course.toUpperCase().includes(course.toUpperCase())
    case "strength":
    case "defense":
    case "agility":
    case "dexterity":
      return action.type === PlayerActionType.Exercise && action.exercise.toUpperCase().includes(course.toUpperCase())
  }
}

export async function train(ns: NS, attr: Skills): Promise<boolean> {
  const player = ns.getPlayer()

  const shouldFocus = !ns.singularity.getOwnedAugmentations().includes("Neuroreceptor Management Implant")

  switch (attr) {
    case "charisma":
    case "hacking": {
      const uniName =
        player.city !== BEST_UNI_CITY && !ns.singularity.travelToCity(BEST_UNI_CITY)
          ? UNI_MAP[player.city]
          : UNI_MAP[BEST_UNI_CITY]

      if (!uniName) {
        return false
      }

      return ns.singularity.universityCourse(uniName, getCourseName(attr), shouldFocus)
    }
    case "strength":
    case "defense":
    case "agility":
    case "dexterity": {
      const gymName =
        player.city !== BEST_GYM_CITY && !ns.singularity.travelToCity(BEST_GYM_CITY)
          ? GYM_MAP[player.city]
          : GYM_MAP[BEST_GYM_CITY]

      if (!gymName) {
        return false
      }

      return ns.singularity.gymWorkout(gymName, getCourseName(attr), shouldFocus)
    }
  }
}

export default class TrainAction extends BaseAction {
  protected attribute: Skills
  protected minLevel: number

  constructor(attribute: Skills, minLevel = 10) {
    super()

    this.attribute = attribute
    this.minLevel = minLevel
  }

  setMinLevel(lvl: number): void {
    this.minLevel = lvl
  }

  getAttribute(): Skills {
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
