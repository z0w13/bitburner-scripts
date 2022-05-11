import setupPolyfill from "/lib/ns-polyfill"
import { NS } from "@ns"
import { FlagSchema } from "/lib/objects"
import { isScriptRunning } from "/lib/func/is-script-running"
import HostManager from "/lib/HostManager"
import JobManager from "/JobScheduler/JobManager"
import JobScheduler from "/JobScheduler/JobScheduler"
import ServerBuyer from "/lib/ServerBuyer"
import { DAEMON_SERVER, LOAD_BUY_THRESHOLD } from "/config"
import waitForPids from "/lib/func/wait-for-pids"

const flagSchema: FlagSchema = [
  ["once", false],
  ["prep", false],
]

interface Flags {
  once: boolean
  prep: boolean
}

// TODO(zowie): Elegantly handle upgrading servers?
// TODO(zowie): Figure out how to semi-accurately calculate stuff without Formulas.exe
// TODO(zowie): Hack and setup scripts, maybe periodic script?
// TODO(zowie): Tests for various classes
export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  await waitForPids(ns, [ns.exec("/libexec/static-data.js", DAEMON_SERVER, 1)])

  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags

  const hostMgr = new HostManager(ns)
  const jobMgr = new JobManager(ns, hostMgr)
  const serverBuyer = new ServerBuyer(ns, 8)
  const jobScheduler = new JobScheduler(ns, hostMgr, jobMgr, serverBuyer)

  //if (hostMgr.getTotalRam() < 1024) {
  //  ns.spawn("/libexec/basic-hwgw.js", 1)
  //  return
  //}

  for (const script of ["autosetup.js", "server-status.js", "daemon-status.js"]) {
    if (!isScriptRunning(ns, script, DAEMON_SERVER)) {
      ns.tail(ns.exec(script, DAEMON_SERVER))
    }
  }

  while (true) {
    if (jobMgr.currentMaxLoad() > LOAD_BUY_THRESHOLD) {
      await serverBuyer.buy()
    }
    await jobScheduler.schedule(flags.prep)

    if (flags.once || ns.fileExists("finish-daemon.txt", DAEMON_SERVER)) {
      break
    }

    await ns.asleep(5000)
  }

  while (jobMgr.hasJobs()) {
    jobMgr.clearFinishedJobs()
    ns.print(`Waiting for ${jobMgr.getJobCount()} to finish`)
    await jobScheduler.writeJobStatus()
    await ns.asleep(1000)
  }
}
