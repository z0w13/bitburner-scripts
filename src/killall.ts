import { NS } from '@ns'
import scanHost from '/lib-scan-host'

export async function main(ns : NS) : Promise<void> {
  const hosts = scanHost(ns);
  for (const host in hosts) {
    const procs = ns.ps(host).length;
    if (procs > 0) {
      ns.killall(host);
      ns.print(ns.sprintf("Killed %d processes on %s", procs, host));
    }
  }
}