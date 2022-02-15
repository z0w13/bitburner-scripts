import { NS } from '@ns'
import scanHost from "/lib/scan-host"
import hackHost from "/lib/hack-host"
import isHostSetup from '/lib/is-host-setup';
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from '/constants';

export async function main(ns : NS) : Promise<void> {
  ns.disableLog("scan");
  ns.disableLog("asleep");

  const flags = ns.flags([
    ["interval", 1000],
    ["host", "home"],
    ["scripts", [SCRIPT_HACK, SCRIPT_WEAKEN, SCRIPT_GROW]], // Scripts to install
  ])

  while (true) {
    const hosts = await scanHost(ns);
    for (const hostname in hosts) {
      if (isHostSetup(ns, hostname)) {
        continue;
      }

      if(!hackHost(ns, hostname)) {
        continue
      }

      await ns.scp(flags["scripts"], flags["host"], hostname);
    }

    await ns.asleep(flags["interval"]);
  }
}