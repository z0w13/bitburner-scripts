import ServerWrapper from "/lib/server-wrapper"

export interface Script {
  file: string
  ram: number
}

export interface Command {
  target: ServerWrapper
  threads: number
  ram: number
  time: number
  security: number
  script: Script
}

interface SerializedCommand {
  target: string
  threads: number
  ram: number
  time: number
  security: number
  script: Script
}

export enum JobType {
  Prep = "prep",
  HackWeakenGrowWeaken = "hwgw",
}

export interface Job {
  type: JobType
  target: ServerWrapper
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
