import { NS } from "@ns"
import { Command, SerializedCommand } from "@/Command/Objects"
import { BATCH_INTERVAL } from "@/config"
import runCommand from "@/lib/func/run-command"
import waitForPids from "@/lib/func/wait-for-pids"
import { ServerSnapshot } from "@/lib/objects"
import ServerWrapper from "@/lib/ServerWrapper"
import { sum } from "@/lib/util"

export abstract class Job {
  type: JobType
  target: ServerWrapper
  partial: boolean
  createdAt: number

  snapshot?: ServerSnapshot
  reason?: CantScheduleReason
  current?: Command

  protected _done = false

  constructor(type: JobType, target: ServerWrapper, createdAt: number, partial = false) {
    this.type = type
    this.target = target
    this.partial = partial
    this.createdAt = createdAt
  }

  public get commandsDone(): number {
    return this.current ? this.getCommands().indexOf(this.current) : 0
  }
  public get done(): boolean {
    return this._done
  }

  public abstract getDuration(): number
  public abstract getCommands(): Array<Command>
  public abstract run(ns: NS): Promise<Job>
}

export interface CommandForBatch {
  batchDelay: number
  commandDelay: number
  cmd: Command
  batchId: number
  relativeEnd: number
}

export class SerialJob extends Job {
  commands: ReadonlyArray<Command>

  constructor(
    type: JobType.Prep | JobType.HackWeakenGrowWeaken,
    target: ServerWrapper,
    createdAt: number,
    commands: Array<Command>,
    partial = false,
  ) {
    super(type, target, createdAt, partial)

    this.commands = commands
  }

  public getDuration(): number {
    return sum(this.commands.map((c) => c.getTotalTime()))
  }

  public getCommands(): Array<Command> {
    return [...this.commands]
  }

  public async run(ns: NS): Promise<Job> {
    for (const cmd of this.getCommands()) {
      this.current = cmd
      await waitForPids(
        ns,
        runCommand(ns, cmd, {
          args: ["--target", cmd.target],
        }),
      )
    }

    this._done = true
    return this
  }
}

export class BatchJob extends Job {
  commands: ReadonlyArray<CommandForBatch>

  constructor(target: ServerWrapper, createdAt: number, commands: Array<CommandForBatch>) {
    super(JobType.Batch, target, createdAt, false)

    this.commands = commands
  }

  public get numBatches(): number {
    return Math.floor(this.commands.length / 4)
  }

  public getDuration(): number {
    return Math.max(...this.commands.map((c) => c.cmd.time)) + BATCH_INTERVAL * this.numBatches
  }

  public getCommands(): Array<Command> {
    return [...this.commands.map((c) => c.cmd)]
  }

  public async run(_ns: NS): Promise<Job> {
    // TODO
    this._done = true
    return this
  }
}

export interface SerializedJob {
  type: JobType
  target: string
  commands: Array<SerializedCommand>
  current?: SerializedCommand
  commandsDone: number
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
