import { NS } from "@ns"
import { LOG_LEVEL, MAX_LOAD, MAX_PREP_LOAD } from "/config"
import { Command } from "/Command/Objects"
import { Job } from "/JobScheduler/JobObjects"
import Logger from "/lib/Logger"
import { Script } from "/lib/objects"
import ServerWrapper from "/lib/ServerWrapper"
import { sum } from "/lib/util"

interface BasicServerSnapshot {
  hostname: string
  availableRam: number
  maxRam: number
}

export default class VirtualNetworkState {
  private name: string
  private ns: NS
  private snapshot: Array<BasicServerSnapshot>
  private log: Logger

  constructor(ns: NS, snapshot: Array<BasicServerSnapshot>, name = "") {
    this.name = name
    this.ns = ns
    this.snapshot = [...snapshot.map((s) => ({ ...s }))]
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

    const temp = new VirtualNetworkState(this.ns, this.snapshot)
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
    return command.threads <= this.getAllocatableThreads(command.script)
  }

  allocateCommand(command: Command) {
    let threadsRemaining = command.threads
    const availableServers = [...this.snapshot]

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
      const server = availableServers.pop()
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

      server.availableRam -= serverThreads * command.script.ram
      threadsRemaining -= serverThreads

      this.log.debug(
        "Allocated %d threads on %s which now has %.2f RAM left, %d left to place",
        serverThreads,
        server.hostname,
        server.availableRam,
        threadsRemaining,
      )
    }
  }

  canAllocateJob(job: Job): boolean {
    const biggestCommand = [...job.commands].sort((a, b) => b.threads - a.threads)[0]
    return this.canAllocateCommand(biggestCommand)
  }

  allocateJob(job: Job) {
    const biggestCommand = [...job.commands].sort((a, b) => b.threads - a.threads)[0]
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

    this.allocateCommand(biggestCommand)
  }

  static fromServers(ns: NS, servers: Array<ServerWrapper>): VirtualNetworkState {
    return new VirtualNetworkState(
      ns,
      servers.map((s) => ({ hostname: s.hostname, maxRam: s.maxRam, availableRam: s.maxRam - s.getRamUsed() })),
    )
  }
  /**
   * Create a virtual network state from the provided servers but calculate available ram by ignoring cmd-* scripts
   */
  static fromServersWithoutCommands(ns: NS, servers: Array<ServerWrapper>): VirtualNetworkState {
    return new VirtualNetworkState(
      ns,
      servers.map((s) => ({
        hostname: s.hostname,
        maxRam: s.maxRam,
        availableRam: s.maxRam - s.getNonCommandRamUsed(),
      })),
    )
  }
}
