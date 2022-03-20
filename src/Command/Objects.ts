import { NS } from "@ns"
import { BATCH_INTERVAL } from "/config"
import { Script } from "/lib/objects"
import { sum } from "/lib/util"

export abstract class Command {
  target: string
  protected _threads: number
  time: number
  security: number
  script: Script

  constructor(target: string, threads: number, time: number, security: number, script: Script) {
    this.target = target
    this._threads = threads
    this.time = time
    this.security = security
    this.script = script
  }

  public get ram(): number {
    return this._threads * this.script.ram
  }

  public get threads(): number {
    return this._threads
  }

  public abstract setThreads(ns: NS, threads: number): void
}

export class WeakenCommand extends Command {
  public setThreads(_ns: NS, threads: number): void {
    this._threads = threads
  }
}

export class GrowCommand extends Command {
  public setThreads(ns: NS, threads: number): void {
    this._threads = threads
    this.security = ns.growthAnalyzeSecurity(threads)
  }
}

export class HackCommand extends Command {
  public setThreads(ns: NS, threads: number): void {
    this._threads = threads
    this.security = ns.hackAnalyzeSecurity(threads)
  }
}

export class CommandBatch {
  commands: Array<Command>

  public constructor(commands: Array<Command>) {
    this.commands = commands
  }

  public get target(): string {
    return this.commands[0].target
  }

  public get threads(): number {
    return sum(this.commands.map((c) => c.threads))
  }

  public get ram(): number {
    return sum(this.commands.map((c) => c.ram))
  }

  public get time(): number {
    return Math.max(...this.commands.map((c) => c.time)) + BATCH_INTERVAL
  }
}

export interface SerializedCommand {
  target: string
  threads: number
  ram: number
  time: number
  security: number
  script: Script
}
