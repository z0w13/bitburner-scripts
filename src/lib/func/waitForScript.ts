import getScriptPid from "@/lib/func/get-script-pid"
import { NS } from "@ns"

export async function waitForScript(ns: NS, name: string, host: string, timeout = 0): Promise<number> {
  const startTime = Date.now()

  while (timeout === 0 || startTime + timeout * 1000 > Date.now()) {
    const pid = getScriptPid(ns, name, host)
    if (pid > 0) {
      return pid
    }

    await ns.asleep(500)
  }

  return 0
}
