import { NS } from "@ns"
import getHosts from "/lib/func/get-hosts"
import { COPY_SCRIPTS } from "/constants"
import { DAEMON_SERVER } from "/config"
import rsync from "/lib/func/rsync"
import parseFlags from "/lib/parseFlags"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("scan")

  const flags = parseFlags(ns, {
    host: DAEMON_SERVER,
    scripts: COPY_SCRIPTS, // Scripts to install
    overwrite: false,
  })

  const hosts = getHosts(ns)
  for (const hostname of hosts) {
    if (hostname === flags.host) {
      continue
    }

    if (!ns.hasRootAccess(hostname)) {
      continue
    }

    await rsync(ns, flags["host"], hostname, [...flags["scripts"], new RegExp("/lib/shared/.*")], flags["overwrite"])
  }
}
