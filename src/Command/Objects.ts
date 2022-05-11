import { NS } from "@ns"
import { BATCH_INTERVAL } from "/config"
import renderTable from "/lib/func/render-table"
import Script from "/lib/Script"
import { formatGiB, formatNum, formatTime, sum } from "/lib/util"

export abstract class Command {
  target: string
  protected _threads: number
  time: number
  security: number
  script: Script
  delay: number
  distribute: boolean
  host?: string

  constructor(
    target: string,
    threads: number,
    time: number,
    security: number,
    script: Script,
    delay = 0,
    distribute = true,
  ) {
    this.target = target
    this._threads = threads
    this.time = time
    this.security = security
    this.script = script
    this.delay = delay
    this.distribute = distribute
  }

  public getTotalTime(): number {
    return this.time + this.delay
  }

  public get ram(): number {
    return this._threads * this.script.ram
  }

  public get threads(): number {
    return this._threads
  }

  public abstract setThreads(ns: NS, threads: number): void

  public print(ns: NS) {
    const renderCmd = {
      script: this.script.file,
      threads: formatNum(ns, this.threads, "0,00"),
      time: formatTime(this.time),
      ram: formatGiB(ns, this.ram),
      security: formatNum(ns, this.security),
    }

    ns.print(renderTable(ns, Object.entries(renderCmd), false))
  }
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

export class BatchCommand {
  innerCommand: Command

  constructor(innerCommand: Command) {
    this.innerCommand = innerCommand
  }

  getCommand(endTime: number, uniqId: number): Command {
    const now = Date.now()
    const delay = endTime - now - this.innerCommand.time
    this.innerCommand.script.flags["delay"] = delay
    this.innerCommand.script.args.push("batch-" + uniqId)

    return this.innerCommand
  }
}

export class CommandBatch {
  commands: Array<Command>
  delay: number

  public constructor(commands: Array<Command>, delay = 0) {
    if (commands.length === 0) {
      throw Error("CommandBatch received empty commands array, minimum of 1 command")
    }

    this.commands = commands
    this.delay = delay
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

  public print(ns: NS) {
    ns.print(
      renderTable(
        ns,
        [
          ["Target", this.target],
          ["Threads", this.threads],
          ["Delay", formatNum(ns, this.delay / 1000)],
          ["RAM", formatGiB(ns, this.ram)],
          ["Time", formatTime(this.time)],
        ],
        false,
      ),
    )

    this.commands.forEach((cmd) => {
      ns.print(
        renderTable(
          ns,
          [
            ["Script", cmd.script.file],
            ["Threads", cmd.threads],
            ["RAM", formatGiB(ns, cmd.ram)],
            ["Time", formatTime(cmd.time)],
            ["Sec", formatNum(ns, cmd.security)],
          ],
          false,
        ),
      )
    })
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
