import { NS, Server, Player } from '@ns'
import { Command } from "./lib-objects"
import waitForPids from "./lib-wait-for-pids"
import allocateThreads from './lib-allocate-threads';

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

  //const plan = await planTarget(ns, await ns.getServer(flags["target"]));
  //await runPlan(ns, plan);
  await runPlan(ns);
}

function runCommand(ns: NS, cmd: Command, unique = ""): Array<number> {
  if (cmd.threads > 0) {
    ns.print(ns.sprintf("Running %s taking %s seconds with %d threads.", cmd.script, ns.tFormat(cmd.time), cmd.threads));
    const pids = allocateThreads(ns, cmd.target, cmd.script, cmd.threads, unique);
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
    script: "cmd-hack.js",
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
    script: "cmd-weaken.js",
    time,
    threads,
    security: 0,
    ram: 0,
  }
}

function getGrowCommand(ns: NS, target: Server, player: Player): Command {
  const server = { ...target };
  server.moneyAvailable = target.moneyMax / 2
  server.hackDifficulty = target.minDifficulty

  const requiredGrowth = (server.moneyMax / server.moneyAvailable) - 1;
  const time = ns.formulas.hacking.growTime(server, player);
  const growthPercent = ns.formulas.hacking.growPercent(server, 1, player, 1) - 1;
  const threads = Math.ceil(requiredGrowth / growthPercent);
  const security = ns.growthAnalyzeSecurity(threads);

  return {
    target: target.hostname,
    script: "cmd-grow.js",
    time,
    threads,
    security,
    ram: 0,
  }
}

async function runPlan(ns: NS): Promise<void> {
  let longestTime = 0;
  const TARGET_HOST = "the-hub";

  // Prepare
  // Get money to max
  while (ns.getServerMoneyAvailable(TARGET_HOST) < ns.getServerMaxMoney(TARGET_HOST)) {
    const target = ns.getServer(TARGET_HOST)
    await waitForPids(ns, await runCommand(ns, await getWeakenCommand(ns, target, ns.getPlayer())));
    await waitForPids(ns, await runCommand(ns, await getGrowCommand(ns, target, ns.getPlayer())));
  }

  // Reset security to min
  while (ns.getServerSecurityLevel(TARGET_HOST) > ns.getServerMinSecurityLevel(TARGET_HOST)) {
    const target = ns.getServer(TARGET_HOST)
    await waitForPids(ns, await runCommand(ns, await getWeakenCommand(ns, target, ns.getPlayer())));
  }

  while (true) {
    const player = ns.getPlayer();
    const target = ns.getServer("the-hub");

    const hackCommand = {name: "hack", command: getHackCommand(ns, target, player)};
    const hackWeakenCommand = {name: "hack-weaken", command: getWeakenCommand(ns, target, player, hackCommand.command.security)}
    const growCommand = {name: "grow", command: getGrowCommand(ns, target, player)}
    const growWeakenCommand = {name: "grow-weaken", command: getWeakenCommand(ns, target, player, growCommand.command.security)}

    const commands: Array<{name: string, command: Command}> = [hackCommand, hackWeakenCommand, growCommand, growWeakenCommand];

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

    const id = new Date().getTime();


    void delayedCommand(ns, delays[hackCommand.name], hackCommand, id);
    await ns.asleep(1000);
    void delayedCommand(ns, delays[hackWeakenCommand.name], hackWeakenCommand, id);
    await ns.asleep(1000);
    void delayedCommand(ns, delays[growCommand.name], growCommand, id);
    await ns.asleep(1000);
    void delayedCommand(ns, delays[growWeakenCommand.name], growWeakenCommand, id);
    await ns.asleep(1000);
  }

  //const pids = (await Promise.all(promises)).flat(1);
  //await waitForPids(ns, pids);
}

async function delayedCommand(ns: NS, delay: number, command: {name: string, command: Command}, id = 0): Promise<Array<number>> {
      await ns.asleep(delay)
      return await runCommand(ns, command.command, command.name + id)
}