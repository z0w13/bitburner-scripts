import setupPolyfill from "/lib/ns-polyfill"
import { NS } from "@ns"
import { FlagSchema } from "/lib/objects"
import { isScriptRunning } from "/lib/util"
import { LOAD_BUY_THRESHOLD } from "/config"
import HostManager from "/lib/host-manager"
import JobManager from "/cnc/job-manager"
import JobScheduler from "/cnc/job-scheduler"
import ServerBuyer from "/lib/buy-servers"

const flagSchema: FlagSchema = [["once", false]]

interface Flags {
  once: boolean
}

// TODO(zowie): Elegantly handle upgrading servers?
// TODO(zowie): Figure out how to semi-accurately calculate stuff without Formulas.exe
// TODO(zowie): Hack and setup scripts, maybe periodic script?
// TODO(zowie): Tests for various classes
export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags

  const hostMgr = new HostManager(ns)
  const jobMgr = new JobManager(ns, hostMgr)
  const serverBuyer = new ServerBuyer(ns, 8)
  const jobScheduler = new JobScheduler(ns, hostMgr, jobMgr, serverBuyer)

  for (const script of ["autosetup.js", "server-status.js", "daemon-status.js"]) {
    if (!isScriptRunning(ns, script, "home")) {
      ns.tail(ns.exec(script, "home"))
    }
  }

  while (true) {
    if (jobMgr.currentMaxLoad() > LOAD_BUY_THRESHOLD) {
      await serverBuyer.buy()
    }
    await jobScheduler.schedule()

    if (flags.once || ns.fileExists("finish-daemon.txt", "home")) {
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
