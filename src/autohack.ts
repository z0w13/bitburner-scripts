import { NS } from '@ns'
import scanHost from "./lib-scan-host"
import hackHost from "./lib-hack-host"

export async function main(ns : NS) : Promise<void> {
  ns.disableLog("scan");

  const flags = ns.flags([
    ["interval", 1000]
  ])

  while (true) {
    const hosts = await scanHost(ns);
    for (const hostname in hosts) {
      await hackHost(ns, hostname);
    }

    await ns.sleep(flags["interval"]);
  }
}