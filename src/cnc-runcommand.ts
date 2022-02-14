import { NS } from '@ns'
import waitForPids from '/lib-wait-for-pids';
import getSetupHosts from "./lib-get-setup-hosts"
import waitForTime from "./lib-wait-for-time"

interface Flags {
  "start-at": number
  "delay-between": number
  "max-time": number
  "hack-time": number
  "hack-threads": number
  "weaken-time": number
  "weaken-threads": number
  "grow-time": number
  "grow-threads": number
  "target": string
}

interface Cmd {
  script: string
  threads: number
  time: number
}

export async function main(ns : NS) : Promise<void> {
  ns.disableLog("scan");
  ns.disableLog("asleep");

  const flags = ns.flags([
    ["start-at", 0],
    ["delay-between", 250],
    ["max-time", 0],
    ["hack-time", 0],
    ["hack-threads", 0],
    ["weaken-time", 0],
    ["weaken-threads", 0],
    ["grow-time", 0],
    ["grow-threads", 0],
    ["target", ""],
  ]) as Flags;


  const cmds: Array<Cmd> = [
    {script: "cmd-hack.js", threads: flags["hack-threads"], time: flags["hack-time"]},
    {script: "cmd-weaken.js", threads: flags["weaken-threads"], time: flags["weaken-time"]},
    {script: "cmd-grow.js", threads: flags["grow-threads"], time: flags["grow-time"]},
  ].sort((a: Cmd, b: Cmd) => b.time - a.time)

  const order = ["cmd-grow.js", "cmd-hack.js", "cmd-weaken.js"];

  await waitForTime(ns, flags["start-at"]);

  while (true) {
    const pids = [];

    const currTime = new Date().getTime();

    const delay0 = order.indexOf(cmds[0].script) * flags["delay-between"];
    const delay1 = order.indexOf(cmds[1].script) * flags["delay-between"];
    const delay2 = order.indexOf(cmds[2].script) * flags["delay-between"];

    const script0Time = currTime + delay0
    const script1Time = currTime + delay1 + cmds[0].time - cmds[1].time
    const script2Time = currTime + delay2 + cmds[1].time - cmds[2].time
    const finishTime = currTime + cmds[0].time + 5000; // Add 5 seconds of leeway

    ns.print("script0")
    await waitForTime(ns, script0Time);
    pids.push(...await allocateThreads(ns, flags["target"], cmds[0].script, cmds[0].threads, flags["start-at"]));

    ns.print("script1")
    await waitForTime(ns, script1Time);
    pids.push(...await allocateThreads(ns, flags["target"], cmds[1].script, cmds[1].threads, flags["start-at"]));

    ns.print("script2")
    await waitForTime(ns, script2Time);
    pids.push(...await allocateThreads(ns, flags["target"], cmds[2].script, cmds[2].threads, flags["start-at"]));

    ns.print("Pids n Time")
    await waitForPids(ns, pids, 100);
    await waitForTime(ns, finishTime)
  }
}

async function allocateThreads(ns: NS, target: string, script: string, threads: number, uniqId: number) : Promise<Array<number>> {
  const usableHosts = await getSetupHosts(ns);
  const scriptRam = ns.getScriptRam(script)
  const hosts: Array<{host: string, ram: number}> = [];

  for (const host of usableHosts) {
    const server = ns.getServer(host);
    hosts.push({ host, ram: server.maxRam - server.ramUsed });
  }

  let threadsRemaining = threads;
  const pids = [];
  while (threadsRemaining > 0) {
    const host = hosts.pop()
    if (!host) {
      ns.print("Ran out of hosts, ", threadsRemaining, " not allocated");
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

    ns.print("[" + host.host + "] Running " + script + " with " + hostThreads + " threads.");
    const pid = ns.exec(script, host.host, hostThreads, "--target", target, "--threads", hostThreads, uniqId);
    pids.push(pid);
  }

  return pids
}
