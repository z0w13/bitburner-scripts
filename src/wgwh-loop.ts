import { NS } from "@ns"

import waitForPids from "/lib-wait-for-pids";
import getWeakenCommand from "/lib-get-weaken-command";
import getGrowthCommand from "/lib-get-growth-command";
import getHackCommand from "/lib-get-hack-command";
import runCommand from "/lib-run-command";

async function weakenTillMinSecurity(ns: NS, target: string): Promise<void> {
  while (ns.getServer(target).hackDifficulty > ns.getServerMinSecurityLevel(target)) {
    const weaken = getWeakenCommand(ns, ns.getServer(target));
    ns.print(JSON.stringify(weaken))
    await waitForPids(ns, await runCommand(ns, weaken));
  } 
}
async function grow(ns: NS, target: string): Promise<void> {
  const growth = getGrowthCommand(ns, ns.getServer(target));
  ns.print(JSON.stringify(growth))
  await waitForPids(ns, await runCommand(ns, growth));
}

async function hack(ns: NS, target: string): Promise<void> {
  const hack = await getHackCommand(ns, ns.getServer(target));
  ns.print(JSON.stringify(hack))
  await waitForPids(ns, await runCommand(ns, hack));
}

async function run(ns: NS, target: string): Promise<void> {
  await weakenTillMinSecurity(ns, target);

  while (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.9) {
    await grow(ns, target);
    await weakenTillMinSecurity(ns, target);
  }

  await hack(ns, target);
}

interface Flags {
  target: string
}

export async function main(ns: NS) : Promise<void>{
  ns.disableLog("getServerUsedRam");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMinSecurityLevel");
  ns.disableLog("scan");
  ns.disableLog("asleep");
  ns.disableLog("scp");
  ns.disableLog("exec");
  ns.disableLog("exec");

  const flags = ns.flags([
    ["target", "n00dles"],
  ]) as Flags


  while (true) {
    await run(ns, flags.target);

    await ns.asleep(1000);
  }
}