import type { NS } from "@ns"
import getHosts from "/lib/func/get-hosts"
import hackHost from "/lib/func/hack-host"
import isHostSetup from "/lib/func/is-host-setup"
import { COPY_SCRIPTS } from "/constants"
import { DAEMON_SERVER } from "/config"
import rsync from "/lib/func/rsync"
import parseFlags from "/lib/parseFlags"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = parseFlags(ns, {
    interval: 1000,
    host: DAEMON_SERVER,
    scripts: COPY_SCRIPTS, // Scripts to install
  })

  while (true) {
    const hosts = getHosts(ns)
    for (const hostname of hosts) {
      hackHost(ns, hostname)

      if (isHostSetup(ns, hostname)) {
        continue
      }

      await rsync(ns, flags["host"], hostname, [...flags["scripts"], new RegExp("/lib/shared/.*")])
      ns.printf("Set up %s", hostname)
    }

    await ns.asleep(flags["interval"])
  }
}
