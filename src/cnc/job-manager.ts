import { NS } from "@ns"
import { LOG_LEVEL, MAX_LOAD, MAX_PREP_LOAD } from "/config"
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from "/constants"
import getGrowthCommand from "/lib/get-grow-command"
import getHackCommand from "/lib/get-hack-command"
import getWeakenCommand from "/lib/get-weaken-command"
import HostManager from "/lib/host-manager"
import Logger from "/lib/logger"
import { Command, Job, JobType } from "/lib/objects"
import ServerWrapper from "/lib/server-wrapper"
import { sum } from "/lib/util"
import waitForPids from "/lib/wait-for-pids"

export default class JobManager {
  private readonly ns: NS
  private readonly log: Logger

  private readonly hostMgr: HostManager

  private jobs: Set<Job>
  private jobsByType: Record<JobType, Set<Job>>
  private serversWithJobs: Set<string>

  constructor(ns: NS, hostMgr: HostManager) {
    this.ns = ns
    this.log = new Logger(ns, LOG_LEVEL, "JobManager")

    this.hostMgr = hostMgr

    this.jobs = new Set()
    this.jobsByType = {
      [JobType.Prep]: new Set<Job>(),
      [JobType.HackWeakenGrowWeaken]: new Set<Job>(),
    }
    this.serversWithJobs = new Set()
  }

  clearFinishedJobs(): void {
    this.jobs.forEach((j) => {
      if (!j.done) {
        return
      }

      this.jobs.delete(j)
      this.jobsByType[j.type].delete(j)
      this.serversWithJobs.delete(j.target.hostname)
    })
  }

  recalculateCommand(job: Job, cmd: Command): Command {
    let newCmd: Command
    switch (cmd.script.file) {
      case SCRIPT_GROW:
        newCmd = getGrowthCommand(this.ns, cmd.target)
        break
      case SCRIPT_WEAKEN:
        newCmd = getWeakenCommand(this.ns, cmd.target)
        break
      case SCRIPT_HACK:
        newCmd = getHackCommand(this.ns, cmd.target)
        break
      default:
        newCmd = cmd
    }

    if (newCmd.time - cmd.time < -1000 || newCmd.threads < cmd.threads) {
      this.log.debug(
        `'${cmd.script.file}' for '${job.target.hostname} time ${Math.round(newCmd.time / 1000)}s from ${Math.round(
          cmd.time / 1000,
        )}s threads ${newCmd.threads} from ${cmd.threads}`,
      )

      cmd.time = newCmd.time
      cmd.ram = newCmd.ram
      cmd.security = newCmd.security
      cmd.threads = newCmd.threads
    } else if (newCmd.time - cmd.time > 1000 || newCmd.threads > cmd.threads) {
      this.log.warning(
        `'${cmd.script.file}' for '${job.target.hostname} time ${Math.round(newCmd.time / 1000)}s from ${Math.round(
          cmd.time / 1000,
        )}s threads ${newCmd.threads} from ${cmd.threads}`,
      )
      newCmd = cmd
    } else {
      newCmd = cmd
    }

    return newCmd
  }

  runJob(job: Job): Promise<Job> {
    this.jobs.add(job)
    this.jobsByType[job.type].add(job)
    this.serversWithJobs.add(job.target.hostname)

    return this._runJob(job)
  }

  private async _runJob(job: Job): Promise<Job> {
    // NOTE(zowie): Temporary, mainly to check how often this occurs, and how severely
    for (const cmd of job.commands) {
      const newCmd = this.recalculateCommand(job, cmd)

      cmd.time = newCmd.time
      cmd.ram = newCmd.ram
      cmd.security = newCmd.security
      cmd.threads = newCmd.threads

      job.current = cmd
      await waitForPids(this.ns, this.hostMgr.runCommand(newCmd))
      job.jobsDone++
    }

    job.done = true
    return job
  }

  calculateMaxLoad(jobs: Array<Job>): number {
    return (this.getRamUsedByNonJobs() + this.getUsedRamForJobs(jobs)) / this.hostMgr.getTotalRam()
  }

  getRamUsedByNonJobs(): number {
    const nonJobRam = this.hostMgr
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

    return this.getUsedRamForJobs(jobs) / this.hostMgr.getTotalRam()
  }

  getUsedRamForJobs(jobs: Array<Job>): number {
    return jobs
      .map((j) => Math.max(...j.commands.map((c) => c.ram)))
      .flat()
      .reduce((acc, val) => acc + val, 0)
  }

  canSchedule(job: Job): boolean {
    return this.calculateMaxLoad([...this.jobs].concat(job)) <= MAX_LOAD
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
    return this.calculateMaxLoad([...this.jobs])
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
    return this.hostMgr.getTotalRam() * MAX_LOAD - this.hostMgr.getUsedRam() - this.getUsedRamForJobs(jobs)
  }

  availablePrepRam(prepJobs: Array<Job> = []): number {
    return this.hostMgr.getTotalRam() * (MAX_PREP_LOAD - this.currentPrepLoad()) - this.getUsedRamForJobs(prepJobs)
  }

  hasJobRunning(target: ServerWrapper): boolean {
    return this.serversWithJobs.has(target.hostname)
  }

  getPrepJobs(): Array<Job> {
    return [...this.jobsByType[JobType.Prep]]
  }

  hasPrepJobs(): boolean {
    return this.jobsByType[JobType.Prep].size > 0
  }

  getHwgwJobs(): Array<Job> {
    return [...this.jobsByType[JobType.HackWeakenGrowWeaken]]
  }

  hasHwgwJobs(): boolean {
    return this.jobsByType[JobType.HackWeakenGrowWeaken].size > 0
  }

  async waitForJobsToFinish() {
    while (this.jobs.size > 0) {
      await this.ns.asleep(1000)
      this.clearFinishedJobs()
    }
  }

  getJobs(): Array<Job> {
    return [...this.jobs]
  }

  getJobCount(): number {
    return this.jobs.size
  }

  hasJobs(): boolean {
    return this.getJobCount() > 0
  }
}
