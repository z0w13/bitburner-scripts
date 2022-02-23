import { NS } from "@ns"
import getHosts from "/lib/func/get-hosts"
import hackHost from "/lib/func/hack-host"
import isHostSetup from "/lib/func/is-host-setup"
import { COPY_SCRIPTS } from "/constants"
import setupPolyfill from "/lib/ns-polyfill"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")

  const flags = ns.flags([
    ["interval", 1000],
    ["host", "home"],
    ["scripts", COPY_SCRIPTS], // Scripts to install
  ])

  while (true) {
    const hosts = getHosts(ns)
    for (const hostname of hosts) {
      if (isHostSetup(ns, hostname)) {
        continue
      }

      if (!hackHost(ns, hostname)) {
        continue
      }

      await ns.scp(flags["scripts"], flags["host"], hostname)
      ns.printf("Set up %s", hostname)
    }

    await ns.asleep(flags["interval"])
  }
}
