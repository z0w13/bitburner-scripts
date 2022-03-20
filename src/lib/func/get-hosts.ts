import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"

export default function getHosts(ns: NS): Array<string> {
  return getConnectedHostsRecursive(ns, DAEMON_SERVER)
}

function getConnectedHostsRecursive(ns: NS, target = DAEMON_SERVER, seen = new Set<string>()): Array<string> {
  seen.add(target)
  ns.scan(target)
    .filter((h) => !seen.has(h))
    .forEach((h) => getConnectedHostsRecursive(ns, h, seen))

  return [...seen]
}
