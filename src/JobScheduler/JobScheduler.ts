import { NS } from "@ns"
import { filterUndefinedFunc, formatMoney, sum } from "@/lib/util"
import JobManager from "@/JobScheduler/JobManager"
import {
  DAEMON_SERVER,
  LOG_LEVEL,
  MAX_LOAD,
  MAX_PREP_LOAD,
  MAX_SIMULTANEOUS_PREP_JOBS,
  PERCENTAGE_TO_HACK,
  TARGET_MAX_PREP_WEAKEN_TIME,
  TARGET_MAX_WEAKEN_TIME,
} from "@/config"
import { getGrowCommand, getHackCommand, getWeakenCommand } from "@/Command/Formulas"
import HostManager from "@/lib/HostManager"
import Logger from "@/lib/Logger"
import { CantScheduleReason, Job, JobType, SerialJob } from "@/JobScheduler/JobObjects"
import { Command } from "@/Command/Objects"
import { SerializedDaemonStatus } from "@/lib/serialized"
import ServerWrapper from "@/lib/ServerWrapper"
import { sortFunc } from "@/lib/util"
import VirtualNetworkState from "@/lib/VirtualNetworkState"
import ServerBuyer from "@/lib/ServerBuyer"
import { PreppedTargetInfo } from "@/lib/objects"

// TODO(zowie): Move draining stuff to JobManager
export default class JobScheduler {
  private readonly ns: NS
  private readonly log: Logger

  private readonly hostMgr: HostManager
  private readonly jobMgr: JobManager
  private readonly serverBuyer: ServerBuyer

  private readonly preppedTargets: Record<string, PreppedTargetInfo>
  private readonly preppingTargets: Record<string, ServerWrapper>

  private draining: boolean

  constructor(ns: NS, hostMgr: HostManager, jobMgr: JobManager, serverBuyer: ServerBuyer) {
    this.ns = ns
    this.log = new Logger(ns, LOG_LEVEL, "JobScheduler")

    this.hostMgr = hostMgr
    this.jobMgr = jobMgr
    this.serverBuyer = serverBuyer

    // Add any targets that are already prepped
    this.preppedTargets = {}
    this.preppingTargets = {}
    this.hostMgr
      .getTargetableServers()
      .filter((s) => s.isPrepped() && s.getWeakenTime() <= TARGET_MAX_WEAKEN_TIME)
      .forEach((s) => this.addPreppedTarget(s))

    this.draining = false
  }

  addPreppingTarget(server: ServerWrapper) {
    if (server.hostname in this.preppingTargets) {
      return
    }

    this.preppingTargets[server.hostname] = server
  }

  addPreppedTarget(server: ServerWrapper) {
    if (server.hostname in this.preppedTargets) {
      return
    }

    this.preppedTargets[server.hostname] = { hostname: server.hostname, profitPerSecond: server.getProfitPerSecond() }
  }

  getPreppedTargets(): Array<PreppedTargetInfo> {
    return Object.values(this.preppedTargets)
  }

  getPreppingTargets(): Array<ServerWrapper> {
    return Object.values(this.preppingTargets)
  }

  drain(): void {
    this.draining = true
  }

  updateDrainingStatus(): void {
    if (this.jobMgr.getJobCount() === 0 && this.draining) {
      this.draining = false
    }
  }

  // NOTE(zowie): Should only ever used for prep jobs
  recalculateCommandsForRam(
    commands: Array<Command>,
    networkState: VirtualNetworkState,
  ): { changed: boolean; commands: Array<Command> } {
    const newCommands = []
    let changed = false

    for (const command of commands) {
      if (networkState.getAllocatablePrepThreads(command.script) >= command.threads) {
        newCommands.push(command)
      } else {
        changed = true

        const newThreads = networkState.getAllocatablePrepThreads(command.script)
        const newRam = newThreads * command.script.ram

        if (newThreads === 0) {
          continue
        }

        this.log.debug(
          "Changed '%s' for '%s' to %d from %d threads and %.2fGiB from %.2fGiB RAM",
          command.script.file,
          command.target,
          newThreads,
          command.threads,
          newRam,
          command.ram,
        )

        command.setThreads(this.ns, newThreads)

        newCommands.push(command)
      }
    }

    return { changed: changed, commands: newCommands }
  }

  getBestTheoreticalHwgwJob(networkState: VirtualNetworkState): ServerWrapper | undefined {
    const emptyNetworkState = VirtualNetworkState.fromServersWithoutCommands(this.ns, this.hostMgr.getUsableServers())
    const targetsOrderedForMoney = this.getPreppedTargets()
      .sort((a, b) => b.profitPerSecond - a.profitPerSecond)
      .map((t) => this.hostMgr.getServer(t.hostname))
      .filter<ServerWrapper>(filterUndefinedFunc())

    return targetsOrderedForMoney.find((target) => {
      const job = this.createHwgwJob(target)
      return emptyNetworkState.canAllocateJob(job) && !networkState.canAllocateJob(job)
    })
  }

  createHwgwJob(target: ServerWrapper): Job {
    const player = this.ns.getPlayer()

    const hackCommand = getHackCommand(this.ns, target.getPreppedServer(), player)
    const growCommand = getGrowCommand(
      this.ns,
      target.getPreppedServer({ moneyAvailable: target.moneyMax * (1 - PERCENTAGE_TO_HACK) }),
      player,
    )

    return new SerialJob(
      JobType.HackWeakenGrowWeaken,
      target,
      Date.now(),

      [
        hackCommand,
        getWeakenCommand(
          this.ns,
          target.getPreppedServer({ hackDifficulty: target.minDifficulty + hackCommand.security }),
          player,
        ),
        growCommand,
        getWeakenCommand(
          this.ns,
          target.getPreppedServer({ hackDifficulty: target.minDifficulty + growCommand.security }),
          player,
        ),
      ],
      false,
    )
  }

  planHwgwJobs(networkState: VirtualNetworkState): Array<Job> {
    const targetsOrderedForMoney = this.getPreppedTargets()
      .sort((a, b) => b.profitPerSecond - a.profitPerSecond)
      .map((t) => this.hostMgr.getServer(t.hostname))
    const hwgwJobs: Array<Job> = []

    this.log.debug("Planning targets")
    for (const target of targetsOrderedForMoney) {
      if (!target || !target.isPrepped() || this.jobMgr.hasJobRunning(target)) {
        continue
      }

      const job = this.createHwgwJob(target)

      if (!this.jobMgr.canSchedule(job)) {
        this.log.debug("Can't schedule %s job for %s in job manager", job.type, job.target.hostname)
        continue
      }

      if (!networkState.canAllocateJob(job)) {
        this.log.debug("Can't allocate %s job for %s in virtual network state", job.type, job.target.hostname)
        continue
      }

      this.log.debug("Target %s prepped, creating hwgw job", target.hostname)
      networkState.allocateJob(job)
      hwgwJobs.push(job)
    }

    return hwgwJobs
  }

  getPrepOrder(): Array<ServerWrapper> {
    // Get target servers
    const targets = this.hostMgr.getTargetableServers()

    // Sort target servers by profit divided by weaken time to start making money ASAP
    const targetsByProfit = [...targets].sort(sortFunc((v) => v.getProfitPerSecond() / v.getWeakenTime(), true))

    // Also sort targets we're prepping by profit
    const alreadyPreppingByProfit = this.getPreppingTargets().sort(sortFunc((v) => v.getProfitPerSecond(), true))

    // Prioritize targets we're already prepping over others
    const targetsByPrep = [...alreadyPreppingByProfit, ...targetsByProfit]

    // Split targets into ones that fall within TARGET_MAX_WEAKEN_TIME and those that don't
    const targetsWithinMax = targetsByPrep.filter((v) => v.getWeakenTime() <= TARGET_MAX_PREP_WEAKEN_TIME)
    //const targetsOverMax = targetsByPrep.filter((v) => {
    //  return calculateWeakenTime(v.getServer(), player) > TARGET_MAX_WEAKEN_TIME
    //})

    // Still allow initial weaken over TARGET_MAX_WEAKEN_TIME, but deprioritize them, also remove dupes
    return [...targetsWithinMax /*, ...targetsOverMax*/].filter((v, idx, arr) => arr.indexOf(v) === idx)
  }

  planPrepJobs(networkState: VirtualNetworkState): Array<Job> {
    const targets = this.getPrepOrder()
    const player = this.ns.getPlayer()
    const prepJobs: Array<Job> = []

    for (const target of targets) {
      if (
        !target.isRooted() ||
        target.isPrepped() ||
        this.jobMgr.hasJobRunning(target) ||
        target.hostname in this.preppedTargets
      ) {
        continue
      }

      const commands = []
      if (!target.hasMinSecurity()) {
        commands.push(getWeakenCommand(this.ns, target.getServer(), player))
      }

      if (!target.hasMaxMoney()) {
        commands.push(getGrowCommand(this.ns, target.getServer(), player))
      }

      const recalc = this.recalculateCommandsForRam(commands, networkState)

      const job = new SerialJob(JobType.Prep, target, Date.now(), recalc.commands, recalc.changed)

      if (job.getCommands().length === 0) {
        this.log.debug("Can't schedule %s job for %s no commands left after recalc", job.type, job.target.hostname)
        continue
      }

      if (!this.jobMgr.canSchedule(job)) {
        this.log.debug("Can't schedule %s job for %s in job manager", job.type, job.target.hostname)
        continue
      }

      if (!networkState.canAllocateJob(job)) {
        this.log.debug("Can't allocate %s job for %s in virtual network state", job.type, job.target.hostname)
        continue
      }

      this.log.debug("%s not prepped, creating prep job", target.hostname)

      networkState.allocateJob(job)
      prepJobs.push(job)
    }
    return prepJobs
  }

  async scheduleHwgwJobs(jobs: Array<Job>): Promise<void> {
    this.log.info("Scheduling %d hwgw jobs", jobs.length)
    for (const job of jobs) {
      if (!this.jobMgr.canSchedule(job)) {
        job.reason = CantScheduleReason.ExceedsLoad
        this.log.info("Can't schedule hwgw job for %s", job.target.hostname)
        continue
      }

      if (this.jobMgr.hasJobRunning(job.target)) {
        job.reason = CantScheduleReason.AlreadyRunning
        this.log.debug("Can't schedule hwgw job for %s as it already has a job running", job.target.hostname)
        continue
      }

      void this.jobMgr.runJob(job)
      await this.ns.asleep(5)
    }
  }

  async schedulePrepJobs(jobs: Array<Job>): Promise<void> {
    this.log.info("Scheduling %d prep jobs", jobs.length)
    const activePrepJobs = this.jobMgr.getPrepJobs().length

    for (const job of jobs.slice(0, MAX_SIMULTANEOUS_PREP_JOBS - activePrepJobs)) {
      if (activePrepJobs >= MAX_SIMULTANEOUS_PREP_JOBS) {
        this.log.debug("Ät max prep jobs of %d not scheduling any more", MAX_SIMULTANEOUS_PREP_JOBS)
        job.reason = CantScheduleReason.AtMaxPrepJobs
        continue
      }

      if (!this.jobMgr.canSchedulePrep(job)) {
        if (this.jobMgr.hasHwgwJobs()) {
          job.reason = CantScheduleReason.ExceedsPrepLoad
          this.log.debug(
            "Can't schedule prep job for %s with %d Thr %.2f RAM would exceed %.2f prep load with %.2f",
            job.target.hostname,
            Math.max(...job.getCommands().map((c) => c.ram)),
            this.jobMgr.getUsedRamForJobs([job]),
            MAX_PREP_LOAD,
            this.jobMgr.calculatePrepLoad(this.jobMgr.getPrepJobs().concat(job)),
          )
        } else {
          job.reason = CantScheduleReason.ExceedsPrepLoad
          this.log.debug(
            "Can't schedule prep job for %s with %d Thr %.2f RAM would exceed %.2f load with %.2f",
            job.target.hostname,
            Math.max(...job.getCommands().map((c) => c.ram)),
            this.jobMgr.getUsedRamForJobs([job]),
            MAX_LOAD,
            this.jobMgr.calculateMaxLoad(this.jobMgr.getJobs().concat(job)),
          )
        }

        continue
      }

      if (this.jobMgr.hasJobRunning(job.target)) {
        job.reason = CantScheduleReason.AlreadyRunning
        this.log.debug("Can't schedule prep job for %s as it already has a job running", job.target.hostname)
        continue
      }

      void this.jobMgr
        .runJob(job)
        .then((j) => {
          // Might not be fully prepped if we didn't have the capacity for another prep job
          if (j.target.isPrepped()) {
            delete this.preppingTargets[j.target.hostname]
            this.addPreppedTarget(j.target)
          }
        })
        .catch((r) => this.log.warning(r))
      this.addPreppingTarget(job.target)
      await this.ns.asleep(5)
    }
  }

  removeUnpreppedTargets(): void {
    for (const preppedTarget of this.getPreppedTargets()) {
      const server = this.hostMgr.getServer(preppedTarget.hostname)
      if (!server) {
        this.log.info("Server %s no longer exists, removing", preppedTarget.hostname)
        delete this.preppedTargets[preppedTarget.hostname]
        continue
      }

      if (!this.jobMgr.hasJobRunning(server) && !server.isPrepped()) {
        this.log.warning(
          "Server %s no longer prepped, removing. Sec: %.2f/%d | Money: %d/%d",
          server.hostname,
          server.getSecurityLevel(),
          server.minDifficulty,
          Math.round(server.getMoneyAvailable()),
          server.moneyMax,
        )

        delete this.preppedTargets[preppedTarget.hostname]
      }
    }
  }

  canSchedule(): boolean {
    return !this.jobMgr.atMaxLoad() && !this.draining
  }

  async schedule(prepOnly = false): Promise<Array<Job>> {
    const networkState = VirtualNetworkState.fromServers(this.ns, this.hostMgr.getUsableServers())

    this.log.debug("Clearing finished jobs")
    this.jobMgr.clearFinishedJobs()

    this.log.debug("Remove any targets no longer prepped")
    this.removeUnpreppedTargets()

    this.log.debug("Update draining status")
    this.updateDrainingStatus()

    // We're at our maximum (theoretical) load, or waiting for jobs to drain sleep
    if (this.canSchedule()) {
      const hwgwJobs = prepOnly ? [] : this.planHwgwJobs(networkState)
      const prepJobs = this.planPrepJobs(networkState)

      if (hwgwJobs.length > 0 && !prepOnly) {
        await this.scheduleHwgwJobs(hwgwJobs)
      }

      if (prepJobs.length > 0) {
        await this.schedulePrepJobs(prepJobs)
      }

      if (!prepOnly) {
        const theoreticalBest = this.getBestTheoreticalHwgwJob(networkState)
        const currentProfitPerSecond = sum(this.jobMgr.getHwgwJobs().map((j) => j.target.getProfitPerSecond()))
        if (theoreticalBest && theoreticalBest.getProfitPerSecond() > currentProfitPerSecond) {
          this.drain()
          this.log.info(
            "Draining, found theoretical best in %s with %s profit beating current jobs' %s",
            theoreticalBest.hostname,
            formatMoney(this.ns, theoreticalBest.getProfitPerSecond()),
            formatMoney(this.ns, currentProfitPerSecond),
          )
        }
      }

      await this.writeJobStatus()
      return [...hwgwJobs, ...prepJobs]
    }

    await this.writeJobStatus()
    return []
  }

  async writeJobStatus(): Promise<void> {
    const serialized: SerializedDaemonStatus = {
      lastUpdate: Date.now(),
      preppedTargets: this.getPreppedTargets(),
      prepLoad: this.jobMgr.currentPrepLoad(),
      stopping: this.ns.fileExists("finish-daemon.txt", DAEMON_SERVER),
      profitPerSecond: this.ns.getScriptIncome("daemon.js", DAEMON_SERVER),
      expPerSecond: this.ns.getScriptExpGain("daemon.js", DAEMON_SERVER),
      prepOrder: this.getPrepOrder().map((h) => h.hostname),
      load: this.jobMgr.currentMaxLoad(),
      jobs: this.jobMgr.getJobs().map((j) => ({
        ...j,

        // TODO(zowie): Fix with actual data
        done: j.done,
        commandsDone: j.commandsDone,
        current: j.current
          ? {
              ...j.current,

              threads: j.current.threads,
              ram: j.current.ram,
              target: j.current.target,
            }
          : undefined,

        target: j.target.hostname,
        commands: j.getCommands().map((c) => ({
          ...c,

          threads: c.threads,
          ram: c.ram,
          target: c.target,
        })),
      })),
    }

    //getGlobalState().daemonState = serialized
    this.ns.write("jobs.json.txt", JSON.stringify(serialized), "w")
  }
}
