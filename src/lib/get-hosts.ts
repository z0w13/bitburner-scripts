import { NS } from "@ns"

export default function getHosts(ns: NS): Array<string> {
  return getConnectedHostsRecursive(ns, "home")
}

function getConnectedHostsRecursive(ns: NS, target = "home", seen = new Set<string>()): Array<string> {
  seen.add(target)
  ns.scan(target)
    .filter((h) => !seen.has(h))
    .forEach((h) => getConnectedHostsRecursive(ns, h, seen))

  return [...seen]
}
