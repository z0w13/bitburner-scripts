import { BitNodeMultipliers, CrimeStats } from "@ns"
import { City, LocationName } from "/data/LocationNames"
import ServerWrapper from "/lib/server-wrapper"

export interface Script {
  file: string
  ram: number
  args?: Array<string | number | boolean>
}

export interface Command {
  target: string
  threads: number
  ram: number
  time: number
  security: number
  script: Script
}

export interface CommandBatch {
  target: string
  threads: number
  ram: number
  time: number
  commands: Array<Command>
}

interface SerializedCommand {
  target: string
  threads: number
  ram: number
  time: number
  security: number
  script: Script
}

export enum CantScheduleReason {
  AlreadyRunning = "AlreadyRunning",
  ExceedsLoad = "ExceedsLoad",
  ExceedsPrepLoad = "ExceedsPrepLoad",
  AtMaxPrepJobs = "AtMaxPrepJobs",
}

export enum JobType {
  Prep = "prep",
  HackWeakenGrowWeaken = "hwgw",
}

export interface Job {
  type: JobType
  target: ServerWrapper
  snapshot?: ServerSnapshot
  reason?: CantScheduleReason
  commands: Array<Command>
  current?: Command
  jobsDone: number
  partial: boolean
  createdAt: number
  done: boolean
}

export interface SerializedJob {
  type: JobType
  target: string
  commands: Array<SerializedCommand>
  current?: Command
  jobsDone: number
  partial: boolean
  createdAt: number
  done: boolean
}

export interface PreppedTargetInfo {
  hostname: string
  profitPerSecond: number
}

export interface SerializedDaemonStatus {
  preppedTargets: Array<PreppedTargetInfo>
  lastUpdate: number
  prepLoad: number
  prepOrder: Array<string>
  profitPerSecond: number
  expPerSecond: number
  load: number
  jobs: Array<SerializedJob>
  stopping: boolean
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
