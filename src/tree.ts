import { NS } from '@ns'
import scanHost from '/lib-scan-host'

export async function main(ns : NS) : Promise<void> {
  ns.disableLog("ALL")

  const hosts = scanHost(ns)
  for (const host in hosts) {
    if (host.startsWith("zserv")) {
      continue;
    }

    ns.tprintf("%s - %s", " ".repeat(hosts[host].length), host)
  }
}