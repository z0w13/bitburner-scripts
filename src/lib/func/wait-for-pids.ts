import type { NS } from "@ns"

export default async function waitForPids(
  ns: NS,
  pids: Array<number>,
  interval = 1000,
  cb?: (rem: number) => void,
): Promise<void> {
  if (pids.filter((p) => p < 1).length > 0) {
    ns.print("WARNING: pids contains failed execs")
  }

  let newPids = pids
  do {
    for (const pid of pids) {
      if (!ns.isRunning(pid, "")) {
        newPids = newPids.filter((v) => v != pid)
      }
    }

    pids = newPids
    if (cb) {
      cb(pids.length)
    }
    await ns.asleep(interval)
  } while (pids.length > 0)
}
