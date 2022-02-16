import { NS } from "@ns"

export default async function waitForPids(ns: NS, pids: Array<number>, interval = 1000): Promise<void> {
  let newPids = pids
  do {
    for (const pid of pids) {
      if (!ns.isRunning(pid, "")) {
        newPids = newPids.filter((v) => v != pid)
      }
    }

    pids = newPids
    await ns.asleep(interval)
  } while (pids.length > 0)
}
