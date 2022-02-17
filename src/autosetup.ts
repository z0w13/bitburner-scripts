import { NS } from "@ns"
import scanHost from "/lib/scan-host"
import hackHost from "/lib/hack-host"
import isHostSetup from "/lib/is-host-setup"
import { COPY_SCRIPTS } from "/constants"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("scan")
  ns.disableLog("asleep")

  const flags = ns.flags([
    ["interval", 1000],
    ["host", "home"],
    ["scripts", COPY_SCRIPTS], // Scripts to install
  ])

  while (true) {
    const hosts = scanHost(ns)
    for (const hostname in hosts) {
      if (isHostSetup(ns, hostname)) {
        continue
      }

      if (!hackHost(ns, hostname)) {
        continue
      }

      await ns.scp(flags["scripts"], flags["host"], hostname)
    }

    await ns.asleep(flags["interval"])
  }
}
