import { NS } from "@ns"
import { MAX_LOAD, MAX_PREP_LOAD } from "/config"
import LoadManager from "/lib/load-manager"
import { Command, FlagSchema } from "/lib/objects"
import getWeakenCommand from "/lib/get-weaken-command"
import getGrowthCommand from "/lib/get-growth-command"
import ServerWrapper from "/lib/server-wrapper"
import getHackCommand from "/lib/get-hack-command"
import runCommand from "/lib/run-command"
import waitForPids from "/lib/wait-for-pids"
import Logger, { LogLevel } from "/lib/util"

const flagSchema: FlagSchema = [["once", false]]

interface Flags {
  once: boolean
}

enum JobType {
  Prep = "prep",
  HackWeakenGrowWeaken = "hwgw",
}

interface Job {
  type: JobType
  target: ServerWrapper
  commands: Array<Command>
  current?: Command
  done: boolean
}

function currentMaxLoad(jobs: Array<Job>, loadMgr: LoadManager): number {
  const theoreticalMaxJobRam = jobs
    .map((j) => Math.max(...j.commands.map((c) => c.ram)))
    .flat()
    .reduce((acc, val) => acc + val, 0)

  const currentJobRam = jobs.map((j) => j.current?.ram ?? 0).reduce((acc, val) => acc + val, 0)

  const additionalMaxRam = theoreticalMaxJobRam - currentJobRam

  return (loadMgr.getUsedRam() + additionalMaxRam) / loadMgr.getTotalRam()
}

export async function main(ns: NS): Promise<void> {
  const log = new Logger(ns, LogLevel.Debug, "daemon")

  ns.disableLog("scan")
  ns.disableLog("asleep")
  ns.disableLog("getServerUsedRam")
  ns.disableLog("getServerMoneyAvailable")
  ns.disableLog("getServerSecurityLevel")

  const flags = ns.flags(flagSchema) as Flags

  const loadMgr = new LoadManager(ns)
  let jobs: Array<Job> = []

  //const autosetupPid = ns.exec("autosetup.js", "home")
  //ns.tail(autosetupPid)

  //const autobuyPid = ns.exec("autobuy.js", "home")
  //ns.tail(autobuyPid)

  while (true) {
    // TODO: Hack and setup scripts, maybe periodic script?

    // Clear any finished jobs
    log.debug("Clearing finished jobs")
    jobs = jobs.filter((j) => !j.done)

    // We're at our maximum (theoretical) load, sleep
    if (currentMaxLoad(jobs, loadMgr) >= MAX_LOAD) {
      log.debug("Currently at max load, do nothing")
      await ns.asleep(1000)
      continue
    }

    const targets = loadMgr.getTargetServers()
    const prepJobs: Array<Job> = []
    const hwgwJobs: Array<Job> = []

    log.debug("Planning targets")
    for (const target of targets) {
      if (!target.isRooted()) {
        continue
      }

      const jobRunning = jobs.filter((j) => j.target === target).length > 0
      if (jobRunning) {
        log.debug("Job running for %s, skipping", target.hostname)
        continue
      }

      if (!target.isPrepped()) {
        // TODO: do a heccin prep
        log.debug("Target %s not prepped, creating prep job", target.hostname)
        prepJobs.push({
          type: JobType.Prep,
          done: false,
          target,
          commands: [getWeakenCommand(ns, target), getGrowthCommand(ns, target)],
        })
        continue
      }

      const hackCommand = getHackCommand(ns, target)
      const growCommand = getGrowthCommand(ns, target)

      log.debug("Target %s prepped, creating hwgw job", target.hostname)
      hwgwJobs.push({
        type: JobType.HackWeakenGrowWeaken,
        done: false,
        target,
        commands: [
          hackCommand,
          getWeakenCommand(ns, target, hackCommand.security),
          growCommand,
          getWeakenCommand(ns, target, growCommand.security),
        ],
      })
    }

    log.debug("Scheduling %d hwgw jobs", hwgwJobs.length)
    for (const job of hwgwJobs) {
      log.debug("%j", job)
      if (currentMaxLoad(jobs.concat(job), loadMgr) > MAX_LOAD) {
        continue
      }

      jobs.push(job)
      void runJob(ns, job)
    }

    if (currentMaxLoad(jobs, loadMgr) > MAX_LOAD) {
      log.debug("Max load exceeded after hwgw jobs, skipping prep jobs")
      continue
    }

    log.debug("Scheduling %d prep jobs", prepJobs.length)
    const hasHwgwJobs = jobs.filter((j) => j.type == JobType.HackWeakenGrowWeaken).length > 0
    for (const job of prepJobs) {
      log.debug("%j", job)
      const prepJobRam = jobs
        .filter((j) => j.type == JobType.Prep)
        .map((j) => Math.max(...j.commands.map((c) => c.ram)))
        .reduce((acc, val) => acc + val, 0)

      if (prepJobRam / loadMgr.getTotalRam() > MAX_PREP_LOAD && !hasHwgwJobs) {
        break
      }

      if (currentMaxLoad(jobs.concat(job), loadMgr) > MAX_LOAD) {
        continue
      }

      jobs.push(job)
      void runJob(ns, job)
    }

    await ns.write("jobs.json", JSON.stringify(jobs), "w")

    if (flags.once) {
      break
    }

    await ns.asleep(1000)
  }
}

async function runJob(ns: NS, job: Job): Promise<void> {
  for (const cmd of job.commands) {
    job.current = cmd
    await waitForPids(ns, runCommand(ns, cmd))
  }

  job.done = true
}
