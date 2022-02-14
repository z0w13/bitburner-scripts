import { NS } from "@ns"
import getSetupHosts from "./lib-get-setup-hosts"

function printStatus(ns: NS): void {
  const hosts = getSetupHosts(ns).concat(["home"])
  const hostLength = hosts.map((h: string) => h.length).sort((a: number, b: number) => b - a).at(0);

  ns.print(ns.sprintf(
    "%" + hostLength + "s | %7s | %27s",
    "Host",
    "Threads",
    "RAM",
  ));
  ns.print("===========================================================================");

  let totalThreads = 0;
  let totalRam = 0;
  let totalRamUsed = 0;

  for (const host of hosts) {
    const processes = ns.ps(host);
    const server = ns.getServer(host);

    if (server.maxRam === 0) {
      continue;
    }

    let hostThreads = 0;
    for (const process of processes) {
      hostThreads += process.threads;
    }
    
    totalThreads += hostThreads
    totalRam += server.maxRam
    totalRamUsed += server.ramUsed

    ns.print(ns.sprintf(
      "%" + hostLength + "s | %7s | %7s/%7s (%3d%%) | [%-20s]",
      host,
      hostThreads,
      ns.nFormat(server.ramUsed*1024*1024*1024, "0ib"),
      ns.nFormat(server.maxRam*1024*1024*1024, "0ib"),
      (server.ramUsed / server.maxRam) * 100,
      "=".repeat(Math.ceil((server.ramUsed / server.maxRam) * 20)),
    ));

  }
  ns.print(ns.sprintf(
    "%" + hostLength + "s | %7s | %7s/%7s (%3d%%) | [%-20s]",
    "Total (" + hosts.length + ")",
    totalThreads,
      ns.nFormat(totalRamUsed*1024*1024*1024, "0ib"),
      ns.nFormat(totalRam*1024*1024*1024, "0ib"),
      (totalRamUsed / totalRam) * 100,
      "=".repeat(Math.ceil((totalRamUsed / totalRam) * 20)),
  ));

}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("getServerUsedRam");
  ns.disableLog("scan");
  ns.disableLog("asleep");

  while (true) {
    ns.clearLog();
    printStatus(ns);
    await ns.asleep(1000);
  }
}