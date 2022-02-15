import { NS } from '@ns'
import scanHost from '/lib-scan-host'

export async function main(ns : NS) : Promise<void> {
  const hosts = scanHost(ns);
  let totalKilled = 0;
  for (const host in hosts) {
    const procs = ns.ps(host).filter(v => v.filename !== "killall.js");
    if (procs.length === 0) {
      continue;
    }

    for (const proc of procs) {
      totalKilled += ns.kill(proc.pid) ? 1 : 0
    }

    ns.tprintf("Killed %d processes on %s", procs.length, host);
  }

  ns.tprintf("Killed %s total processes!", ns.nFormat(totalKilled, "0,0"))
}