import { NS } from "@ns"
import getHosts from "/lib/func/get-hosts"
import isHostSetup from "/lib/func/is-host-setup"
import { COPY_SCRIPTS } from "/constants"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("scan")

  const flags = ns.flags([
    ["interval", 1000],
    ["host", "home"],
    ["scripts", COPY_SCRIPTS], // Scripts to install
    ["overwrite", false],
  ])

  while (true) {
    const hosts = getHosts(ns)
    for (const hostname of hosts) {
      if (hostname === "home") {
        continue
      }

      if (!ns.hasRootAccess(hostname)) {
        continue
      }

      if (!flags["overwrite"] && isHostSetup(ns, hostname)) {
        continue
      }

      await ns.scp(flags["scripts"], flags["host"], hostname)
    }

    await ns.sleep(flags["interval"])
  }
}
