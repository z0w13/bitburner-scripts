import type { NS } from "@ns"
import parseFlags from "@/lib/parseFlags"
import { DAEMON_SERVER } from "@/config"
import getHostPath from "@/lib/func/get-host-path"

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags(ns, { host: DAEMON_SERVER })
  const path = getHostPath(ns, flags.host)
  if (!path) {
    ns.tprint(`ERROR: No path to ${flags.host}`)
    return
  }

  for (const name of path) {
    ns.tprint(`INFO: Connecting to ${flags.host}`)
    if (!ns.singularity.connect(name)) {
      ns.tprint(`ERROR: Couldn't connect to ${name}`)
      break
    }
  }
}
