import { NS } from "@ns"
import { LOG_LEVEL, MAX_LOAD, MAX_PREP_LOAD } from "/config"
import LoadManager from "/lib/load-manager"
import { Command, FlagSchema, Script } from "/lib/objects"
import getWeakenCommand from "/lib/get-weaken-command"
import getGrowCommand from "./lib/get-grow-command"
import ServerWrapper from "/lib/server-wrapper"
import getHackCommand from "/lib/get-hack-command"
import waitForPids from "/lib/wait-for-pids"
import Logger from "/lib/logger"

const flagSchema: FlagSchema = [["once", false]]

interface Flags {
  once: boolean
}

enum JobType {
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
  done: boolean
}

interface ServerSnapshot {
  hostname: string
  availableRam: number
  maxRam: number
}

function sum(values: Array<number>): number {
  return values.reduce((acc, val) => acc + val, 0)
}

// TODO(zowie): Expand calculations, account for MAX_LOAD, etc.
// MAX_LOAD needs to be across the network, not just per server
// can't rely on RAM because that doesn't accurately represent space due to scripts not always fitting
// also can't just AVAIL_THREADS * MAX_LOAD as that'll just continue filling up the pool
class VirtualNetworkState {
  ns: NS
  snapshot: Array<ServerSnapshot>
  log: Logger

  constructor(ns: NS, snapshot: Array<ServerSnapshot>) {
    this.ns = ns
    this.snapshot = [...snapshot.map((s) => ({ ...s }))]
    this.log = new Logger(ns, LOG_LEVEL, "VirtualNetworkState")
  }

  // Considering we can't run half a script on a host
  // we need to calculate the RAM we can actually allocate
  //
  // Returns max allocatable ram honoring MAX_LOAD
  getAllocatableMaxRam(script: Script): number {
    return this.getAllocatableMaxThreads(script) * script.ram
  }

  getAllocatableMaxThreads(script: Script): number {
    const threads = sum(this.snapshot.map((h) => Math.floor(h.maxRam / script.ram)))
    return Math.floor(threads * MAX_LOAD)
  }

  getAllocatableThreads(script: Script): number {
    const max = this.getAllocatableMaxThreads(script)
    const allocated = sum(this.snapshot.map((h) => Math.floor((h.maxRam - h.availableRam) / script.ram)))
    //this.log.debug(`allocated ${allocated} of ${max} threads, ${max - allocated} available`)
    return max - allocated
  }

  getAllocatableRam(script: Script): number {
    return this.getAllocatableThreads(script) * script.ram
  }

  allocateCommand(command: Command) {
    let threadsRemaining = command.threads
    const availableServers = [...this.snapshot]

    while (threadsRemaining > 0) {
      const server = availableServers.pop()
      if (!server) {
        // Ran out of servers before we ran out of threads
        break
      }

      const serverThreads = Math.min(Math.floor(server.availableRam / command.script.ram), threadsRemaining)

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

  allocateJob(job: Job) {
    const biggestCommand = [...job.commands].sort((a, b) => b.threads - a.threads)[0]
    this.allocateCommand(biggestCommand)
  }

  static fromServers(ns: NS, servers: Array<ServerWrapper>): VirtualNetworkState {
    return new VirtualNetworkState(
      ns,
      servers.map((s) => ({ hostname: s.hostname, maxRam: s.maxRam, availableRam: s.maxRam - s.getRamUsed() })),
    )
  }
}

class JobManager {
  ns: NS
  log: Logger

  loadMgr: LoadManager

  jobs: Array<Job>

  constructor(ns: NS, loadMgr: LoadManager) {
    this.ns = ns
    this.log = new Logger(ns, LOG_LEVEL, "JobManager")

    this.loadMgr = loadMgr

    this.jobs = []
  }

  clearFinishedJobs(): void {
    this.jobs = this.jobs.filter((j) => !j.done)
  }

  async runJob(job: Job): Promise<Job> {
    this.jobs.push(job)

    for (const cmd of job.commands) {
      job.current = cmd
      await waitForPids(this.ns, this.loadMgr.runCommand(cmd))
      job.jobsDone++
    }

    job.done = true
    return job
  }

  calculateMaxLoad(jobs: Array<Job>): number {
    return (this.getRamUsedByNonJobs() + this.getUsedRamForJobs(jobs)) / this.loadMgr.getTotalRam()
  }

  getRamUsedByNonJobs(): number {
    const nonJobRam = this.loadMgr
      .getUsableServers()
      .map((s) => s.getProcesses())
      .flat()
      .filter((p) => !p.filename.startsWith("cmd-"))
      .map((p) => p.threads * this.ns.getScriptRam(p.filename))

    return sum(nonJobRam)
  }

  calculatePrepLoad(jobs: Array<Job>, ignorePrepMaxWithoutHwgwJobs = true): number {
    if (ignorePrepMaxWithoutHwgwJobs && !this.hasHwgwJobs()) {
      return this.calculateMaxLoad(jobs)
    }

    return this.getUsedRamForJobs(jobs) / this.loadMgr.getTotalRam()
  }

  getUsedRamForJobs(jobs: Array<Job>): number {
    return jobs
      .map((j) => Math.max(...j.commands.map((c) => c.ram)))
      .flat()
      .reduce((acc, val) => acc + val, 0)
  }

  canSchedule(job: Job): boolean {
    return this.calculateMaxLoad(this.jobs.concat(job)) <= MAX_LOAD
  }

  canSchedulePrep(job: Job, ignorePrepMaxWithoutHwgwJobs = true) {
    if (!this.canSchedule(job)) {
      return
    }

    if (ignorePrepMaxWithoutHwgwJobs && !this.hasHwgwJobs()) {
      return this.canSchedule(job)
    }

    return this.calculatePrepLoad(this.getPrepJobs().concat(job), ignorePrepMaxWithoutHwgwJobs) <= MAX_PREP_LOAD
  }

  currentMaxLoad(): number {
    return this.calculateMaxLoad(this.jobs)
  }

  atMaxLoad(): boolean {
    return this.currentMaxLoad() >= MAX_LOAD
  }

  currentPrepLoad(): number {
    return this.calculatePrepLoad(this.getPrepJobs())
  }

  atMaxPrepLoad(ignorePrepMaxWithoutHwgwJobs = true): boolean {
    if (ignorePrepMaxWithoutHwgwJobs && !this.hasHwgwJobs()) {
      return this.atMaxLoad()
    }

    return this.currentPrepLoad() > MAX_PREP_LOAD
  }

  availableRam(jobs: Array<Job> = []): number {
    return this.loadMgr.getTotalRam() * MAX_LOAD - this.loadMgr.getUsedRam() - this.getUsedRamForJobs(jobs)
  }

  availablePrepRam(prepJobs: Array<Job> = []): number {
    return this.loadMgr.getTotalRam() * (MAX_PREP_LOAD - this.currentPrepLoad()) - this.getUsedRamForJobs(prepJobs)
  }

  isJobRunning(target: ServerWrapper) {
    return this.jobs.filter((j) => j.target === target).length > 0
  }

  getPrepJobs(): Array<Job> {
    return this.jobs.filter((j) => j.type == JobType.Prep)
  }

  hasPrepJobs(): boolean {
    return this.getPrepJobs().length > 0
  }

  getHwgwJobs(): Array<Job> {
    return this.jobs.filter((j) => j.type == JobType.HackWeakenGrowWeaken)
  }

  hasHwgwJobs(): boolean {
    return this.getHwgwJobs().length > 0
  }

  async waitForJobsToFinish() {
    while (this.jobs.length > 0) {
      await this.ns.asleep(1000)
      this.clearFinishedJobs()
    }
  }

  getJobs(): Array<Job> {
    return this.jobs
  }

  hasJobs(): boolean {
    return this.getJobs().length > 0
  }
}

interface PreppedTargetInfo {
  hostname: string
  profitPerSecond: number
}

class JobScheduler {
  ns: NS
  log: Logger

  loadMgr: LoadManager
  jobMgr: JobManager

  preppedTargets: Array<PreppedTargetInfo>

  constructor(ns: NS, loadMgr: LoadManager, jobMgr: JobManager) {
    this.ns = ns
    this.log = new Logger(ns, LOG_LEVEL, "JobScheduler")

    this.loadMgr = loadMgr
    this.jobMgr = jobMgr

    // Add any targets that are already prepped
    this.preppedTargets = this.loadMgr
      .getTargetableServers()
      .filter((s) => s.isPrepped())
      .map((s) => ({ hostname: s.hostname, profitPerSecond: s.getProfitPerSecond() }))
  }

  recalculateCommandsForRam(
    commands: Array<Command>,
    networkState: VirtualNetworkState,
  ): { changed: boolean; commands: Array<Command> } {
    const newCommands = []
    let changed = false

    for (const command of commands) {
      if (networkState.getAllocatableThreads(command.script) >= command.threads) {
        newCommands.push(command)
      } else {
        changed = true

        const newThreads = networkState.getAllocatableThreads(command.script)
        if (newThreads === 0) {
          continue
        }
        const newRam = newThreads * command.script.ram

        this.log.debug(
          "Changed command '%s' for '%s' to %d from %d threads and %.2fGiB RAM from %.2fGiB",
          command.script.file,
          command.target.hostname,
          newThreads,
          command.threads,
          newRam,
          command.ram,
        )

        command.threads = newThreads
        command.ram = newRam % newCommands.push(command)
      }
    }

    return { changed: changed, commands: newCommands }
  }

  planHwgwJobs(networkState: VirtualNetworkState): Array<Job> {
    const targetsOrderedForMoney = [...this.preppedTargets]
      .sort((a, b) => b.profitPerSecond - a.profitPerSecond)
      .map((t) => this.loadMgr.getserver(t.hostname))
    const hwgwJobs: Array<Job> = []

    this.log.debug("Planning targets")
    for (const target of targetsOrderedForMoney) {
      if (!target.isPrepped() || this.jobMgr.isJobRunning(target)) {
        continue
      }

      const hackCommand = getHackCommand(this.ns, target)
      const growCommand = getGrowCommand(this.ns, target)

      const job = {
        type: JobType.HackWeakenGrowWeaken,
        done: false,
        partial: false,
        target,
        jobsDone: 0,
        commands: [
          hackCommand,
          getWeakenCommand(this.ns, target, hackCommand.security),
          growCommand,
          getWeakenCommand(this.ns, target, growCommand.security),
        ],
      }

      if (!this.jobMgr.canSchedule(job)) {
        continue
      }

      this.log.debug("Target %s prepped, creating hwgw job", target.hostname)
      networkState.allocateJob(job)
      hwgwJobs.push(job)
    }
    return hwgwJobs
  }

  planPrepJobs(networkState: VirtualNetworkState): Array<Job> {
    const targets = this.loadMgr.getTargetableServers()
    const prepJobs: Array<Job> = []
    for (const target of [...targets].sort((a, b) => a.getHackTime() - b.getHackTime())) {
      if (
        !target.isRooted() ||
        target.isPrepped() ||
        this.jobMgr.isJobRunning(target) ||
        this.preppedTargets.findIndex((t) => t.hostname == target.hostname) > -1
      ) {
        continue
      }

      const recalc = this.recalculateCommandsForRam(
        [getWeakenCommand(this.ns, target), getGrowCommand(this.ns, target)],
        networkState,
      )

      const job = {
        type: JobType.Prep,
        done: false,
        partial: recalc.changed,
        target,
        jobsDone: 0,
        commands: recalc.commands,
      }

      if (job.commands.length === 0 || !this.jobMgr.canSchedulePrep(job)) {
        continue
      }

      this.log.debug("Target %s not prepped, creating prep job", target.hostname)
      networkState.allocateJob(job)
      prepJobs.push(job)
    }
    return prepJobs
  }

  async scheduleHwgwJobs(jobs: Array<Job>): Promise<void> {
    this.log.info("Scheduling %d hwgw jobs", jobs.length)
    for (const job of jobs) {
      if (!this.jobMgr.canSchedule(job)) {
        this.log.info("Can't schedule hwgw job for %s", job.target.hostname)
        continue
      }

      void this.jobMgr.runJob(job)
      await this.ns.asleep(5)
    }
  }

  async schedulePrepJobs(jobs: Array<Job>): Promise<void> {
    this.log.info("Scheduling %d prep jobs", jobs.length)
    for (const job of jobs) {
      if (!this.jobMgr.canSchedulePrep(job)) {
        if (this.jobMgr.hasHwgwJobs()) {
          this.log.info(
            "Can't schedule prep job for %s with %d Thr %.2f RAM would exceed %f load with %f",
            job.target.hostname,
            Math.max(...job.commands.map((c) => c.ram)),
            this.jobMgr.getUsedRamForJobs([job]),
            MAX_PREP_LOAD,
            this.jobMgr.calculatePrepLoad(this.jobMgr.getPrepJobs().concat(job)),
          )
        } else {
          this.log.info(
            "Can't schedule prep job for %s with %d Thr %.2f RAM would exceed %f load with %f",
            job.target.hostname,
            Math.max(...job.commands.map((c) => c.ram)),
            this.jobMgr.getUsedRamForJobs([job]),
            MAX_LOAD,
            this.jobMgr.calculateMaxLoad(this.jobMgr.getPrepJobs().concat(job)),
          )
        }

        continue
      }

      void this.jobMgr
        .runJob(job)
        .then((j) => {
          // Might not be fully prepped if we didn't have the capacity for another prep job
          if (j.target.isPrepped()) {
            this.preppedTargets.push({ hostname: j.target.hostname, profitPerSecond: j.target.getProfitPerSecond() })
          }
        })
        .catch((r) => this.log.warning(r))

      await this.ns.asleep(5)
    }
  }

  removeUnpreppedTargets(): void {
    for (const preppedTarget of [...this.preppedTargets]) {
      const server = this.loadMgr.getserver(preppedTarget.hostname)
      if (!this.jobMgr.isJobRunning(server) && !server.isPrepped()) {
        this.log.warning(
          `Server ${
            server.hostname
          } no longer prepped, removing from prepped list. Sec: ${server.getHackDifficulty()}/${
            server.minDifficulty
          } | Money: ${server.getMoneyAvailable()}/${server.moneyMax}`,
        )
        this.preppedTargets.splice(this.preppedTargets.indexOf(preppedTarget))
      }
    }
  }

  async schedule(): Promise<void> {
    const networkState = VirtualNetworkState.fromServers(this.ns, this.loadMgr.getUsableServers())

    this.log.debug("Clearing finished jobs")
    this.jobMgr.clearFinishedJobs()

    this.log.debug("Remove any targets no longer prepped")
    this.removeUnpreppedTargets()

    // We're at our maximum (theoretical) load, sleep
    if (!this.jobMgr.atMaxLoad()) {
      const hwgwJobs = this.planHwgwJobs(networkState)
      const prepJobs = this.planPrepJobs(networkState)

      if (hwgwJobs.length > 0) {
        await this.scheduleHwgwJobs(hwgwJobs)
      }

      if (prepJobs.length > 0) {
        await this.schedulePrepJobs(prepJobs)
      }
    }

    await this.writeJobStatus()
  }

  async writeJobStatus(): Promise<void> {
    await this.ns.write(
      "jobs.json",
      JSON.stringify({
        preppedTargets: this.preppedTargets.length,
        prepLoad: this.jobMgr.currentPrepLoad(),
        load: this.jobMgr.currentMaxLoad(),
        jobs: this.jobMgr.jobs,
      }),
      "w",
    )
  }
}

// TODO(zowie): Globally check for RAM rounding as we shouldn't do that really
// TODO(zowie): Elegantly handle upgrading servers?
// TODO(zowie): Figure out how to semi-accurately calculate stuff without Formulas.exe
// TODO: Hack and setup scripts, maybe periodic script?
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags

  const loadMgr = new LoadManager(ns)
  const jobMgr = new JobManager(ns, loadMgr)
  const jobScheduler = new JobScheduler(ns, loadMgr, jobMgr)

  //const autosetupPid = ns.exec("autosetup.js", "home")
  //ns.tail(autosetupPid)

  //const autobuyPid = ns.exec("autobuy.js", "home")
  //ns.tail(autobuyPid)

  while (true) {
    await jobScheduler.schedule()

    if (flags.once || ns.fileExists("finish-daemon.txt", "home")) {
      break
    }

    await ns.asleep(1000)
  }

  while (jobMgr.hasJobs()) {
    await jobScheduler.writeJobStatus()
    jobMgr.clearFinishedJobs()
    await ns.asleep(1000)
  }
}
