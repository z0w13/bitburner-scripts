import type { NS } from "@ns"
import getSetupHosts from "/lib/func/get-setup-hosts"
import Script from "/lib/Script"

// TODO(zowie): We need to use MAX_LOAD correctly
export default function getThreadsAvailable(ns: NS, script: Script): number {
  const setupHosts = getSetupHosts(ns)

  let threads = 0

  for (const hostname of setupHosts) {
    const server = ns.getServer(hostname)
    threads += Math.floor((server.maxRam - server.ramUsed) / script.ram)
  }

  return threads
}
