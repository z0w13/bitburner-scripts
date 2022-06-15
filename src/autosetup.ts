import { NS } from "@ns"
import getHosts from "/lib/func/get-hosts"
import hackHost from "/lib/func/hack-host"
import isHostSetup from "/lib/func/is-host-setup"
import { COPY_SCRIPTS } from "/constants"
import setupPolyfill from "/lib/ns-polyfill"
import { DAEMON_SERVER } from "/config"
import rsync from "/lib/func/rsync"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")

  const flags = ns.flags([
    ["interval", 1000],
    ["host", DAEMON_SERVER],
    ["scripts", COPY_SCRIPTS], // Scripts to install
  ])

  while (true) {
    const hosts = getHosts(ns)
    for (const hostname of hosts) {
      if (isHostSetup(ns, hostname)) {
        continue
      }

      await rsync(ns, flags["host"], hostname, [...flags["scripts"], new RegExp("/lib/shared/.*")])
      ns.printf("Set up %s", hostname)

      hackHost(ns, hostname)
    }

    await ns.asleep(flags["interval"])
  }
}
