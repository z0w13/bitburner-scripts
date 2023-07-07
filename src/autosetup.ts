import { type NS } from "@ns"
import getHosts from "@/lib/func/get-hosts"
import hackHost from "@/lib/func/hack-host"
import isHostSetup from "@/lib/func/is-host-setup"
import { COPY_SCRIPTS } from "@/constants"
import { DAEMON_SERVER } from "@/config"
import rsync from "@/lib/func/rsync"
import parseFlags from "@/lib/parseFlags"
import getHostPath from "@/lib/func/get-host-path"
import { FactionJoinRequirementData } from "@/data/Factions"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = parseFlags(ns, {
    interval: 1000,
    host: DAEMON_SERVER,
    scripts: COPY_SCRIPTS, // Scripts to install
  })

  const backdoorHosts = Object.values(FactionJoinRequirementData)
    .map((d) => d.backdoor)
    .filter<string>((d): d is string => d !== undefined)

  while (true) {
    const hosts = getHosts(ns)
    for (const hostname of hosts) {
      hackHost(ns, hostname)
      const server = ns.getServer(hostname)

      if (!server.backdoorInstalled && backdoorHosts.includes(hostname) && server.hasAdminRights) {
        try {
          const path = getHostPath(ns, hostname)
          if (path) {
            path.forEach((p) => ns.singularity.connect(p))
            await ns.singularity.installBackdoor()
            ns.toast(`Backdoored ${hostname}`, "success")
            ns.singularity.connect("home")
          }
        } catch (e) {
          ns.tprint("ERR: ", e)
        }
      }

      if (isHostSetup(ns, hostname)) {
        continue
      }

      await rsync(ns, flags["host"], hostname, [...flags["scripts"], new RegExp("/lib/shared/.*")])
      ns.printf("Set up %s", hostname)
    }

    await ns.asleep(flags["interval"])
  }
}
