import { NS } from "@ns"
import getSetupHosts from "./lib-get-setup-hosts"

const SCRIPTS = ["cmd-grow.js", "cmd-weaken.js", "cmd-hack.js"];

async function printStatus(ns: NS): Promise<void> {
  const hosts = await getSetupHosts(ns)
  const hostLength = hosts.map((h: string) => h.length).sort((a: number, b: number) => b - a).at(0);

  ns.print("=========================================================");
  ns.print(ns.sprintf(
    "%" + hostLength + "s | %6s | %s",
    "Host",
    "Threads",
    "Log",
  ));

  let totalThreads = 0;
  for (const host of hosts) {
    const processes = ns.ps(host);

    let hackProcess;
    for (const process of processes) {
      if (SCRIPTS.indexOf(process.filename) > -1) {
        hackProcess = process
        break;
      }
    }

    let logs = ["Idle"];

    if (hackProcess) {
      logs = ns.getScriptLogs(hackProcess.filename, host, ...hackProcess.args);
      totalThreads += hackProcess.threads
    }

    ns.print(ns.sprintf(
      "%" + hostLength + "s | %6s | %s",
      host,
      hackProcess ? hackProcess.threads : "",
      logs.at(-1) ?? "",
    ));

  }
  ns.print(ns.sprintf(
    "%" + hostLength + "s | %s",
    "Total (" + hosts.length + ")",
    totalThreads,
  ));

}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("getServerUsedRam");
  ns.disableLog("scan");
  ns.disableLog("asleep");

  while (true) {
    ns.clearLog();
    await printStatus(ns);
    await ns.asleep(1000);
  }
}