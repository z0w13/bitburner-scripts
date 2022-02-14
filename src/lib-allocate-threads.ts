import { NS } from "@ns";
import getSetupHosts from "/lib-get-setup-hosts";

export default function allocateThreads(ns: NS, target: string, script: string, threads: number, unique = ""): Array<number> {
  const usableHosts = getSetupHosts(ns);
  const scriptRam = ns.getScriptRam(script)
  const hosts: Array<{ host: string, ram: number }> = [];

  for (const host of usableHosts) {
    const server = ns.getServer(host);
    hosts.push({ host, ram: server.maxRam - server.ramUsed });
  }

  let threadsRemaining = threads;
  const pids = [];
  while (threadsRemaining > 0) {
    const host = hosts.pop()
    if (!host) {
      ns.print(ns.sprintf("Ran out of hosts, %d not allocated", threadsRemaining));
      break
    }

    let hostThreads = Math.floor(host.ram / scriptRam);
    if (hostThreads === 0) {
      continue;
    }

    if (threadsRemaining < hostThreads) {
      host.ram -= hostThreads * scriptRam;
      hostThreads = threadsRemaining
      hosts.push(host);
    }

    threadsRemaining -= hostThreads;

    const pid = ns.exec(script, host.host, hostThreads, "--target", target, "--threads", hostThreads, unique);
    pids.push(pid);
  }

  return pids
}
