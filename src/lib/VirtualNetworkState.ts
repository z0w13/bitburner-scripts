import type { NS } from "@ns"
import { LOG_LEVEL, MAX_LOAD, MAX_PREP_LOAD } from "@/config"
import { Command } from "@/Command/Objects"
import { Job, JobType } from "@/JobScheduler/JobObjects"
import Logger from "@/lib/Logger"
import Script from "@/lib/Script"
import ServerWrapper from "@/lib/ServerWrapper"
import { formatGiB, sum } from "@/lib/util"

class BasicServerSnapshot {
  readonly hostname: string
  readonly availableRam: number
  readonly maxRam: number

  constructor(hostname: string, availableRam: number, maxRam: number) {
    this.hostname = hostname
    this.availableRam = availableRam
    this.maxRam = maxRam
  }

  allocateRam(ram: number): BasicServerSnapshot {
    return new BasicServerSnapshot(this.hostname, this.availableRam - ram, this.maxRam)
  }

  copy(): BasicServerSnapshot {
    return new BasicServerSnapshot(this.hostname, this.availableRam, this.maxRam)
  }
}

export default class VirtualNetworkState {
  private name: string
  private ns: NS
  private snapshot: ReadonlyArray<BasicServerSnapshot>
  private log: Logger

  constructor(ns: NS, snapshot: Array<BasicServerSnapshot>, name = "") {
    this.name = name
    this.ns = ns
    this.snapshot = [...snapshot.map((s) => s.copy())]
    this.log = new Logger(ns, LOG_LEVEL, "VirtualNetworkState" + (name !== "" ? `-${name}` : ""))
  }

  getLoad(): number {
    return this.getAvailableRam() / this.getMaxRam()
  }

  getMaxRam(): number {
    return sum(this.snapshot.map((s) => s.maxRam))
  }

  getAvailableRam(): number {
    return sum(this.snapshot.map((s) => s.availableRam))
  }

  getLoadOfJob(job: Job): number {
    if (!this.canAllocateJob(job)) {
      return -1
    }

    const temp = new VirtualNetworkState(this.ns, this.getSnapshot())
    temp.allocateJob(job)

    return this.getLoad() - temp.getLoad()
  }

  // Considering we can't run half a script on a host
  // we need to calculate the RAM we can actually allocate
  //
  // Returns max allocatable ram honoring MAX_LOAD
  getAllocatableMaxRam(script: Script): number {
    return this.getAllocatableMaxThreads(script) * script.ram
  }

  getAllocatableRam(script: Script): number {
    return this.getAllocatableThreads(script) * script.ram
  }

  getAllocatableMaxThreads(script: Script): number {
    const threads = sum(this.snapshot.map((h) => Math.floor(h.maxRam / script.ram)))
    return Math.floor(threads * MAX_LOAD)
  }

  getAllocatableThreads(script: Script): number {
    const totalThreads = this.getAllocatableMaxThreads(script)
    const usedThreads = sum(this.snapshot.map((h) => Math.floor((h.maxRam - h.availableRam) / script.ram)))

    // We can have more used threads than all total allocatable threads so in that case there's none available
    const allocatableThreads = Math.max(0, totalThreads - usedThreads)

    return allocatableThreads
  }

  getAllocatableMaxPrepThreads(script: Script): number {
    const threads = sum(this.snapshot.map((h) => Math.floor(h.maxRam / script.ram)))
    return Math.floor(threads * MAX_PREP_LOAD)
  }

  // TODO(zowie): calculate based on prep load available
  getAllocatablePrepThreads(script: Script): number {
    return this.getAllocatableMaxPrepThreads(script)
  }

  canAllocateCommand(command: Command): boolean {
    if (command.distribute) {
      return command.threads <= this.getAllocatableThreads(command.script)
    } else {
      return this.snapshot.findIndex((s) => s.availableRam > command.ram) > -1
    }
  }

  canAllocateCommands(commands: Array<Command>): boolean {
    try {
      this.allocateCommands(commands)
      return true
    } catch (_err) {
      return false
    }
  }

  allocateCommands(commands: Array<Command>): VirtualNetworkState {
    let state: VirtualNetworkState = this /* eslint-disable-line @typescript-eslint/no-this-alias */

    while (commands.length > 0) {
      const command = commands.pop()
      if (!command) {
        break
      }

      state = state.allocateCommand(command)
    }

    return state
  }

  allocateCommand(command: Command) {
    let threadsRemaining = command.threads
    const servers = [...this.snapshot.map((s) => s.copy())]
    const availableServers = [...servers]

    if (!this.canAllocateCommand(command)) {
      const err = this.ns.sprintf(
        "Tried to allocate '%s' with %d threads but only %d available",
        command.script.file,
        command.threads,
        this.getAllocatableThreads(command.script),
      )

      this.log.error(err)
      throw new Error(err)
    }

    while (threadsRemaining > 0) {
      let server = availableServers.pop()
      if (!server) {
        // Ran out of servers before we ran out of threads
        break
      }

      const serverThreads = Math.min(Math.floor(server.availableRam / command.script.ram), threadsRemaining)

      if (server.availableRam - serverThreads * command.script.ram < 0) {
        this.log.error(
          "Server %s available ram hit below 0, current value %f, skipping, rounding error?",
          server.hostname,
          server.availableRam,
        )
        throw Error("AAAAA")
      }

      server = server.allocateRam(serverThreads * command.script.ram)
      threadsRemaining -= serverThreads

      this.log.debug(
        "Allocated %d threads on %s which now has %.2f RAM left, %d left to place",
        serverThreads,
        server.hostname,
        server.availableRam,
        threadsRemaining,
      )
    }

    return new VirtualNetworkState(this.ns, servers, this.name)
  }

  canAllocateJob(job: Job): boolean {
    if (job.type !== JobType.Batch) {
      const biggestCommand = [...job.getCommands()].sort((a, b) => b.threads - a.threads)[0]
      return this.canAllocateCommand(biggestCommand)
    } else {
      return this.canAllocateCommands(job.getCommands())
    }
  }

  allocateJob(job: Job): VirtualNetworkState {
    const biggestCommand = [...job.getCommands()].sort((a, b) => b.threads - a.threads)[0]
    if (!this.canAllocateJob(job)) {
      const err = this.ns.sprintf(
        "Job for '%s' Tried to allocate '%s' with %d threads but only %d available",
        job.target,
        biggestCommand.script.file,
        biggestCommand.threads,
        this.getAllocatableThreads(biggestCommand.script),
      )

      this.log.error(err)
      throw new Error(err)
    }

    return job.type === JobType.Batch ? this.allocateCommands(job.getCommands()) : this.allocateCommand(biggestCommand)
  }

  allocateScript(script: Script, threads: number): [VirtualNetworkState, string] {
    const ram = script.ram * threads
    const server = this.snapshot.find((s) => s.availableRam > ram)

    if (!server) {
      throw Error(`Cannot allocate ${script.file} with ${threads} threads taking ${formatGiB(this.ns, ram)}`)
    }

    const newState = this.allocateServerRam(server.hostname, ram)
    return [newState, server.hostname]
  }

  allocateServerRam(hostname: string, ram: number): VirtualNetworkState {
    const snapshot = this.getSnapshot()
    const serverIdx = snapshot.findIndex((s) => s.hostname === hostname)

    if (serverIdx === -1) {
      throw Error(`Couldn't find server with hostname ${hostname} in snapshot`)
    }

    snapshot[serverIdx] = snapshot[serverIdx].allocateRam(ram)
    return new VirtualNetworkState(this.ns, snapshot, this.name)
  }

  getSnapshot(): Array<BasicServerSnapshot> {
    return this.snapshot.map((s) => s.copy())
  }

  copy(): VirtualNetworkState {
    return new VirtualNetworkState(this.ns, [...this.snapshot], this.name)
  }

  static fromServers(ns: NS, servers: Array<ServerWrapper>): VirtualNetworkState {
    return new VirtualNetworkState(
      ns,
      servers.map((s) => new BasicServerSnapshot(s.hostname, s.maxRam, s.maxRam - s.getRamUsed())),
    )
  }
  /**
   * Create a virtual network state from the provided servers but calculate available ram by ignoring cmd-* scripts
   */
  static fromServersWithoutCommands(ns: NS, servers: Array<ServerWrapper>): VirtualNetworkState {
    return new VirtualNetworkState(
      ns,
      servers.map((s) => new BasicServerSnapshot(s.hostname, s.maxRam, s.maxRam - s.getNonCommandRamUsed())),
    )
  }
}
