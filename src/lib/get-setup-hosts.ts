import getHosts from "/lib/get-hosts"
import isHostSetup from "/lib/is-host-setup"

export default function getSetupHosts(ns: NS): Array<string> {
  return getHosts(ns).filter((h) => isHostSetup(ns, h))
}
