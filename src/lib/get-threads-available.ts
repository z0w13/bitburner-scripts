import { NS } from "@ns"
import getSetupHosts from "/lib/get-setup-hosts"

// TODO(zowie): We need to use MAX_LOAD somehow
export default function getThreadsAvailable(ns: NS, script: string, host = "home"): number {
  const scriptRam = ns.getScriptRam(script, host)
  const setupHosts = getSetupHosts(ns)

  let threads = 0

  for (const hostname of setupHosts) {
    const server = ns.getServer(hostname)
    threads += Math.floor((server.maxRam - server.ramUsed) / scriptRam)
  }

  return threads
}
