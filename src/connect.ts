import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import getHostPath from "/lib/func/get-host-path"

import setupPolyfill from "/lib/ns-polyfill"
import { FlagSchema } from "/lib/objects"

const flagSchema: FlagSchema = [["host", DAEMON_SERVER]]

interface Flags {
  host: string
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  const flags = ns.flags(flagSchema) as Flags
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
