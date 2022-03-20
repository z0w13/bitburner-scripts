import { BitNodeMultipliers, CrimeStats } from "@ns"
import { DAEMON_SERVER } from "/config"
import { City, LocationName } from "/data/LocationNames"

export type ScriptArg = string | number | boolean

export class Script {
  file: string
  ram: number
  args?: Array<ScriptArg>

  constructor(file: string, ram: number, args?: Array<ScriptArg>) {
    this.file = file
    this.ram = ram
    this.args = args
  }

  static fromFile(ns: NS, file: string, args?: Array<ScriptArg>) {
    return new Script(file, ns.getScriptRam(file, DAEMON_SERVER), args)
  }
}

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
