import { NS } from '@ns'
import scanHost from "./lib-scan-host"
import isHostSetup from "./lib-is-host-setup"

export async function main(ns : NS) : Promise<void> {
  ns.disableLog("scan");

  const flags = ns.flags([
    ["interval", 1000],
    ["host", "home"],
    ["scripts", ["cmd-hack.js", "cmd-weaken.js", "cmd-grow.js"]], // Scripts to install
    ["overwrite", false],
  ])

  while (true) {
    const hosts = await scanHost(ns);
    for (const hostname in hosts) {
      if (! await ns.hasRootAccess(hostname)) {
        continue;
      }

      if (!flags["overwrite"] && await isHostSetup(ns, hostname)) {
        continue;
      }

      await ns.scp(flags["scripts"], flags["host"], hostname);
    }

    await ns.sleep(flags["interval"]);
  }
}