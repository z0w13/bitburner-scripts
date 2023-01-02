import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import getSetupHosts from "/lib/func/get-setup-hosts"
import { formatNum } from "/lib/util"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const usableHosts = getSetupHosts(ns)
    .filter((h) => ns.getServerMaxRam(h) > 7)
    .filter((h) => !h.startsWith("hacknet-node-"))

  let totalThreads = 0
  for (const host of usableHosts) {
    ns.print(`Setting up ${host}`)

    if (!ns.fileExists("stanek.js", host)) {
      ns.scp(["stanek.js"], host, DAEMON_SERVER)
    }

    if (!ns.getRunningScript("stanek.js", host)) {
      const maxThreads = Math.floor(
        (ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ns.getScriptRam("stanek.js", DAEMON_SERVER),
      )

      if (maxThreads === 0) {
        continue
      }

      ns.exec("stanek.js", host, maxThreads)
      ns.print(`Started stanek charging on ${host} with ${formatNum(ns, maxThreads)} threads`)
      totalThreads += maxThreads
    } else {
      const script = ns.getRunningScript("stanek.js", host)
      if (!script) {
        continue
      }

      totalThreads += script.threads
    }
  }

  ns.print(`Stanek charging with ${formatNum(ns, totalThreads)} total threads`)
}
