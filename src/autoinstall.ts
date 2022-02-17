import { NS } from "@ns"
import scanHost from "/lib/scan-host"
import isHostSetup from "/lib/is-host-setup"
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
    const hosts = scanHost(ns)
    for (const hostname in hosts) {
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
