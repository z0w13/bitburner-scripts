import { Command, SerializedCommand } from "/Command/Objects"
import { ServerSnapshot } from "/lib/objects"
import ServerWrapper from "/lib/ServerWrapper"

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

export enum CantScheduleReason {
  AlreadyRunning = "AlreadyRunning",
  ExceedsLoad = "ExceedsLoad",
  ExceedsPrepLoad = "ExceedsPrepLoad",
  AtMaxPrepJobs = "AtMaxPrepJobs",
}

export enum JobType {
  Prep = "prep",
  HackWeakenGrowWeaken = "hwgw",
  Batch = "batch",
}
