import { NS, Server, Player } from '@ns'
import { Command } from "/lib/objects"
import waitForPids from "/lib/wait-for-pids"
import allocateThreads from '/lib/allocate-threads';
import setupNsPolyfill from "/lib/ns-polyfill"
import { SCRIPT_GROW, SCRIPT_HACK, SCRIPT_WEAKEN } from '/constants';

interface Flags {
  "target": string
  "host": string
  "autobuy": boolean
  "autobuy-nextstep": boolean
  "autobuy-minram": number
  "autobuy-interval": number
  "autohack": boolean
  "autohack-interval": number
  "autoinstall": boolean
  "autoinstall-interval": number
}

export async function main(ns: NS): Promise<void> {
  setupNsPolyfill(ns);

  ns.disableLog("scan");
  ns.disableLog("asleep");
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMinSecurityLevel");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("exec");

  const flags = ns.flags([
    ["target", "n00dles"],
    ["host", "home"], // Host to run scripts on, probably just home
    ["autobuy", false],
    ["autobuy-nextstep", false],
    ["autobuy-minram", 8],
    ["autobuy-interval", 1000],
    ["autohack", false],
    ["autohack-interval", 1000],
    ["autoinstall", false],
    ["autoinstall-interval", 1000],
  ]) as Flags

  if (flags["autobuy"]) {
    const args = ["--nextstep", flags["autobuy-nextstep"] ? "true" : "false", "--min-ram", flags["autobuy-minram"], "--interval", flags["autobuy-interval"]]

    ns.exec("autobuy.js", flags["host"], 1, ...args);
    ns.tail("autobuy.js", flags["host"], ...args)
  }

  if (flags["autohack"]) {
    const args = ["--interval", flags["autohack-interval"]]

    ns.exec("autohack.js", flags["host"], 1, ...args);
    ns.tail("autohack.js", flags["host"], ...args)
  }

  if (flags["autoinstall"]) {
    const args = ["--interval", flags["autoinstall-interval"], "--host", flags["host"]]; // TODO(zowie): also pass script flags

    ns.exec("autoinstall.js", flags["host"], 1, ...args);
    ns.tail("autoinstall.js", flags["host"], ...args)
  }

  await runPlan(ns, flags["target"]);
}

function runCommand(ns: NS, cmd: Command, unique = "", delay = 0): Array<number> {
  if (cmd.threads > 0) {
    //ns.print(ns.sprintf("Running %s taking %s seconds with %d threads.", cmd.script, ns.tFormat(cmd.time), cmd.threads));
    const pids = allocateThreads(ns, cmd.target, cmd.script, cmd.threads, "--delay", delay, unique);
    return pids
  }

  ns.print(ns.sprintf("Got cmd %s with target %s with 0 threads ", cmd.script, cmd.target));
  return []
}

function getHackCommand(ns: NS, target: Server, player: Player): Command {
  const server = { ...target };
  server.hackDifficulty = target.minDifficulty
  server.moneyAvailable = target.moneyMax

  const pct = ns.formulas.hacking.hackPercent(server, player); // Ceil it to be safe
  const threads = Math.floor(0.5 / pct);
  const time = ns.formulas.hacking.hackTime(server, player);
  const security = ns.hackAnalyzeSecurity(threads);

  return {
    target: target.hostname,
    script: SCRIPT_HACK,
    time,
    threads,
    security,
    ram: 0,
  }
}

function getWeakenCommand(ns: NS, target: Server, player: Player, addedSecurity = 0): Command {
  const server = { ...target };
  server.hackDifficulty = target.minDifficulty + addedSecurity
  server.moneyAvailable = target.moneyMax

  const time = ns.formulas.hacking.weakenTime(server, player);
  const requiredReduction = server.hackDifficulty - server.minDifficulty;
  const threads = Math.ceil(requiredReduction / ns.weakenAnalyze(1, 1));

  return {
    target: target.hostname,
    script: SCRIPT_WEAKEN,
    time,
    threads,
    security: 0,
    ram: 0,
  }
}

function getGrowCommand(ns: NS, target: Server, player: Player, moneyAvailable = 0): Command {
  const server = { ...target };
  server.moneyAvailable = moneyAvailable > 0 ? moneyAvailable : target.moneyMax / 2
  server.hackDifficulty = target.minDifficulty

  const requiredGrowth = (server.moneyMax / server.moneyAvailable) - 1;
  const time = ns.formulas.hacking.growTime(server, player);
  const growthPercent = ns.formulas.hacking.growPercent(server, 1, player, 1) - 1;
  const threads = Math.ceil(requiredGrowth / growthPercent);
  const security = ns.growthAnalyzeSecurity(threads);

  return {
    target: target.hostname,
    script: SCRIPT_GROW,
    time,
    threads,
    security,
    ram: 0,
  }
}

interface Batch {
  id: number,
  promises: Array<Promise<void>>,
  failed: boolean
}

async function runPlan(ns: NS, targetHost: string): Promise<void> {
  let longestTime = 0;
  let INTERVAL = 4000;

  // Prepare
  // Get money to max
  while (ns.getServerMoneyAvailable(targetHost) < ns.getServerMaxMoney(targetHost)) {
    const target = ns.getServer(targetHost)
    await waitForPids(ns, await runCommand(ns, await getWeakenCommand(ns, target, ns.getPlayer(), target.hackDifficulty - target.minDifficulty)));
    await waitForPids(ns, await runCommand(ns, await getGrowCommand(ns, target, ns.getPlayer(), target.moneyAvailable)));
  }

  // Reset security to min
  while (ns.getServerSecurityLevel(targetHost) > ns.getServerMinSecurityLevel(targetHost)) {
    const target = ns.getServer(targetHost)
    await waitForPids(ns, await runCommand(ns, await getWeakenCommand(ns, target, ns.getPlayer(), target.hackDifficulty - target.minDifficulty)));
  }

  const player = ns.getPlayer();
  const target = ns.getServer(targetHost);

  const hackCommand = { name: "hack", command: getHackCommand(ns, target, player) };
  const hackWeakenCommand = { name: "hack-weaken", command: getWeakenCommand(ns, target, player, hackCommand.command.security) }
  const growCommand = { name: "grow", command: getGrowCommand(ns, target, player) }
  const growWeakenCommand = { name: "grow-weaken", command: getWeakenCommand(ns, target, player, growCommand.command.security) }

  const commands: Array<{ name: string, command: Command }> = [hackCommand, hackWeakenCommand, growCommand, growWeakenCommand];

  // Get longest command time
  for (const command of commands) {
    if (command.command.time > longestTime) {
      longestTime = command.command.time;
    }
  }

  const batches: Array<Batch> = [];

  let batchId = 0;
  let batchSuccess = 0;
  let batchFailure = 0;
  let batchTotal = 0;

  while(true) {
    ns.tprint("Starting batch");
    let firstGrowWeaken: Promise<void> | null = null;
    const runAmount = 4//Math.floor(longestTime / (INTERVAL*4));

    for (let i = 0; i<runAmount; i++) {
      const player = ns.getPlayer();
      const target = ns.getServer(targetHost);

      const hackCommand = { name: "hack", command: getHackCommand(ns, target, player) };
      const hackWeakenCommand = { name: "hack-weaken", command: getWeakenCommand(ns, target, player, hackCommand.command.security) }
      const growCommand = { name: "grow", command: getGrowCommand(ns, target, player) }
      const growWeakenCommand = { name: "grow-weaken", command: getWeakenCommand(ns, target, player, growCommand.command.security) }

      const commands: Array<{ name: string, command: Command }> = [hackCommand, hackWeakenCommand, growCommand, growWeakenCommand];

      // Get longest command time
      for (const command of commands) {
        if (command.command.time > longestTime) {
          longestTime = command.command.time;
        }
      }

      // Calculate delays per command
      const delays: Record<string, number> = {};
      for (const command of commands) {
        delays[command.name] = longestTime - command.command.time;
      }

      const hackPromise = delayedCommand(ns, delays[hackCommand.name], hackCommand, batchId)
      const hackWeakenPromise = delayedCommand(ns, delays[hackWeakenCommand.name] + INTERVAL*1, hackWeakenCommand, batchId)
      const growPromise = delayedCommand(ns, delays[growCommand.name] + INTERVAL*2, growCommand, batchId)
      const growWeakenPromise = delayedCommand(ns, delays[growWeakenCommand.name] + INTERVAL*3, growWeakenCommand, batchId)

      if (!firstGrowWeaken) {
        firstGrowWeaken = growWeakenPromise;
      }

      const batch: Batch = {
        id: batchId,
        promises: [hackPromise, hackWeakenPromise, growPromise, growWeakenPromise],
        failed: false,
      }

      batches.push(batch);

      (function(batch) {
        void Promise.allSettled(batch.promises)
          .then(results => {
            const failed = results.map(r => r.status).indexOf("rejected") > -1
            const idx = batches.indexOf(batch);
            batches.splice(idx)

            for (const promise of results) {
                if(promise.status === "rejected") {
                  //ns.tprintf("ERROR Rejected promise, reason: %s", promise.reason)
                }
            }

            if (failed) {
              batchFailure++;
            } else {
              batchSuccess++;
            }
            batchTotal++;
          })
          .catch(e => ns.tprint(e))
      })({ ...batch });

      batchId++;
      ns.printf(JSON.stringify({active: batches.length, total: batchTotal, success: batchSuccess, failure: batchFailure, pct: (batchSuccess/batchTotal*100) ?? 0, id: batchId}));
      await ns.asleep(INTERVAL*4);
    }

    firstGrowWeaken?.finally(() => firstGrowWeaken = null);

    ns.tprint("Batch started");
    while(firstGrowWeaken) {
      ns.printf(JSON.stringify({active: batches.length, total: batchTotal, success: batchSuccess, failure: batchFailure, pct: (batchSuccess/batchTotal*100) ?? 0, id: batchId}));
      await ns.asleep(1000)
    }
    
    // Auto figure out the interval
    if ((batchSuccess/batchTotal) ?? 0 > 0.9) {
      INTERVAL -= 100; 
    } else if ((batchSuccess/batchTotal) ?? 0 < 0.7) {
      INTERVAL += 200;
    }
    ns.tprint("Interval adjusted to ", INTERVAL);
    break;
  }

  await Promise.allSettled(batches.map(b => b.promises).flat());
}

async function delayedCommand(ns: NS, delay: number, { name, command }: { name: string, command: Command}, id = 0): Promise<void> {
  //ns.tprintf("%s %d %s", name, id, new Date(new Date().getTime() + delay + command.time));

  await ns.asleep(delay)

  switch (command.script) {
    case SCRIPT_WEAKEN: {
      const weakenTime = ns.getWeakenTime(command.target)
      if (command.time - 10 > weakenTime) {
        await ns.asleep(command.time - weakenTime)
      }

      if (weakenTime > command.time + 10) {
        throw Error(ns.sprintf("%s, %s, getWeakenTime mismatch: %.2f more than 10ms off %.2f", command.target, name, command.time, weakenTime))
      }
      break;
    }
    case SCRIPT_GROW: {
      const growTime = ns.getGrowTime(command.target)
      if (command.time - 10 > growTime) {
        await ns.asleep(command.time - growTime)
      }

      if (growTime > command.time + 10) {
        throw Error(ns.sprintf("%s, %s, getGrowTime mismatch: %.2f more than 10ms off %.2f", command.target, name, command.time, growTime))
      }
      break;
    }
    case SCRIPT_HACK: {
      const hackTime = ns.getHackTime(command.target)
      // Shorter for some reason wait for a bit
      if (command.time - 10 > hackTime) {
        await ns.asleep(command.time - hackTime)
      }

      if (command.time - 10 > hackTime) {
        throw Error(ns.sprintf("%s, %s, getHackTime mismatch: %.2f more than 10ms off %.2f", command.target, name, command.time, hackTime))
      }

      const moneyAvailable = ns.getServerMoneyAvailable(command.target)
      const moneyMax = ns.getServerMaxMoney(command.target)
      if (moneyAvailable < moneyMax*0.95) {
        throw Error(ns.sprintf("%s, %s, Money mismatch: %s less than 95%% of %s", command.target, name, ns.nFormat(moneyAvailable, "$0,0a"), ns.nFormat(moneyMax, "$0,0a")));
      }
      break;
    }
    default: {
      throw Error(ns.sprintf("%s, %s, Unknown script: %s", command.target, name, command.script))
    }
  }

  const pids = await runCommand(ns, command, name + id)
  if (pids.includes(0)) {
    pids.filter(pid => pid !== 0).forEach(pid => ns.kill(pid));

    throw Error(ns.sprintf("%s, %s, Couldn't start some commands %s!", command.target, name, command.script))
  }

  await waitForPids(ns, pids);
}