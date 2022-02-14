import { NS, Server } from "@ns"
import { Command } from "./lib-objects"

import scanHost from "./lib-scan-host"
import hackHost from "./lib-hack-host"
import waitForPids from "/lib-wait-for-pids";
import allocateThreads from './lib-allocate-threads';

const SCRIPTS = ["cmd-grow.js", "cmd-weaken.js", "cmd-hack.js"];

function getUsableHosts(ns: NS): Array<string> {
  const knownHosts = scanHost(ns);
  const usableHosts = [];

  for (const host in knownHosts) {
    if (hackHost(ns, host)) {
      usableHosts.push(host)
    }
  }

  return usableHosts;
}

async function copyScripts(ns: NS, host: string): Promise<boolean> {
  return await ns.scp(SCRIPTS, host)
}

async function install(ns: NS) : Promise<void> {
  const usableHosts = getUsableHosts(ns);

  for (const host of usableHosts) {
    if (host !== "home") {
      await copyScripts(ns, host);
    }
  }
}

async function getWeakenCommand(ns: NS, target: Server, planSecurity = 0) {
  const requiredReduction = (ns.getServerSecurityLevel(target.hostname) + planSecurity) - target.minDifficulty;
  const weakenThreads = Math.ceil(requiredReduction / ns.weakenAnalyze(1));
  const weakenTime = ns.getWeakenTime(target.hostname);

  return {
    target: target.hostname,
    threads: weakenThreads,
    ram: weakenThreads * ns.getScriptRam("cmd-weaken.js"),
    time: weakenTime,
    security: 0,
    script: "cmd-weaken.js",
  }
}

function getGrowthCommand(ns: NS, target: Server): Command {
  const moneyAvailable = ns.getServerMoneyAvailable(target.hostname);
  const growthAmount = target.moneyMax / moneyAvailable
  const growthThreads = moneyAvailable > 0 ? Math.ceil(ns.growthAnalyze(target.hostname, growthAmount)) : 0;
  const growthTime = ns.getGrowTime(target.hostname);
  const growthSecurity = ns.growthAnalyzeSecurity(growthThreads);

  return {
    target: target.hostname,
    threads: growthThreads,
    ram: growthThreads * ns.getScriptRam("cmd-grow.js"),
    time: growthTime,
    security: growthSecurity,
    script: "cmd-grow.js",
  }
}

function getHackCommand(ns: NS, target: Server): Command {
  const hackAmount = target.moneyMax / 2;
  const hackThreads = Math.ceil(ns.hackAnalyzeThreads(target.hostname, hackAmount));
  const hackTime = ns.getHackTime(target.hostname);
  const hackSecurity = ns.hackAnalyzeSecurity(hackThreads);

  return {
    target: target.hostname,
    threads: hackThreads,
    ram: hackThreads * ns.getScriptRam("cmd-hack.js"),
    time: hackTime,
    security: hackSecurity,
    script: "cmd-hack.js",
  }
}

function runCommand(ns: NS, cmd: Command): Array<number> {
  if (cmd.threads > 0) {
    ns.print("Running ", cmd.script, " taking ", ns.tFormat(cmd.time), " with ", cmd.threads, " threads");
    const pids = allocateThreads(ns, cmd.target, cmd.script, cmd.threads);
    return pids
  } else {
    ns.print("Got cmd with 0 threads ", cmd);
  }

  return []
}

async function run(ns: NS, target: string): Promise<void> {
  const targetServer = ns.getServer(target)

  if (targetServer.minDifficulty + 1 < targetServer.hackDifficulty) {
    const weaken = await getWeakenCommand(ns, targetServer);
    await waitForPids(ns, await runCommand(ns, weaken));
  } else if (targetServer.moneyAvailable < targetServer.moneyMax * 0.9) {
    const growth = await getGrowthCommand(ns, targetServer);
    await waitForPids(ns, await runCommand(ns, growth));
  } else {
    const hack = await getHackCommand(ns, targetServer);
    await waitForPids(ns, await runCommand(ns, hack));
  }
}

interface Flags {
  target: string
}

export async function main(ns: NS) : Promise<void>{
  ns.disableLog("getServerUsedRam");
  ns.disableLog("scan");
  ns.disableLog("asleep");
  ns.disableLog("scp");
  ns.disableLog("exec");

  const flags = ns.flags([
    ["target", "n00dles"],
  ]) as Flags


  while (true) {
    await install(ns);
    await run(ns, flags.target);

    await ns.asleep(1000);
  }
}