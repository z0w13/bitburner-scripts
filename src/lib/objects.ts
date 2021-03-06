import { BitNodeMultipliers, CrimeStats } from "@ns"
import { City, LocationName } from "/data/LocationNames"

export interface PreppedTargetInfo {
  hostname: string
  profitPerSecond: number
}

export type FlagSchema = Array<[string, string | number | boolean | string[]]>

export interface ServerSnapshot {
  hostname: string

  moneyAvailable: number
  moneyMax: number
  profitPerSecond: number

  serverGrowth: number

  maxRam: number
  usedRam: number

  minDifficulty: number
  baseDifficulty: number
  hackDifficulty: number
  requiredHackingSkill: number

  weakenTime: number
  hackTime: number
  growTime: number

  backdoor: boolean
  root: boolean
  purchasedByPlayer: boolean

  prepped: boolean
  draining: boolean
  setup: boolean

  recommended: boolean
  rejectReason: string
}

export enum LogLevel {
  Error = 1,
  Warning,
  Info,
  Debug,
}

export interface StaticData {
  crimes: Array<CrimeStats>
  bitnode_mult: BitNodeMultipliers
  player_mult: {
    hacking_money: number
    hacking_speed: number
    hacking_grow: number
  }
}

export enum Attribute {
  HACKING = "hacking",
  STRENGTH = "strength",
  DEFENSE = "defense",
  DEXTERITY = "dexterity",
  AGILITY = "agility",
  CHARISMA = "charisma",
}

export type CityLocationMap = Partial<Record<City, LocationName>>
