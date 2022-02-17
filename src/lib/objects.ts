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
  prepLoad: number
  profitPerSecond: number
  expPerSecond: number
  load: number
  jobs: Array<SerializedJob>
  stopping: boolean
}

export type FlagSchema = Array<[string, string | number | boolean | string[]]>
