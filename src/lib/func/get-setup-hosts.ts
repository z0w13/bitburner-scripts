import { DEPRIORITIZE_HOME } from "/config"
import getHosts from "/lib/func/get-hosts"
import isHostSetup from "/lib/func/is-host-setup"

export default function getSetupHosts(ns: NS): Array<string> {
  const hosts = getHosts(ns)
    .filter((h) => isHostSetup(ns, h))
    .sort((a, b) => ns.getServerMaxRam(a) - ns.getServerUsedRam(a) - (ns.getServerMaxRam(b) - ns.getServerUsedRam(b)))

  if (DEPRIORITIZE_HOME && hosts.indexOf("home") > -1) {
    hosts.unshift(...hosts.splice(hosts.indexOf("home"), 1))
  }

  return hosts
}
