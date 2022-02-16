import scanHost from "/lib/scan-host"
import isHostSetup from "/lib/is-host-setup"

export default function getSetupHosts(ns: NS): Array<string> {
  const hostnames = scanHost(ns)
  const setupHosts = []

  for (const hostname in hostnames) {
    if (isHostSetup(ns, hostname)) {
      setupHosts.push(hostname)
    }
  }

  return setupHosts
}
