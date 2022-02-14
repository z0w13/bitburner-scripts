const TARGET_HOST = "johnson-ortho"
const SCRIPTS = ["cmd-grow.js", "cmd-weaken.js", "cmd-hack.js"];
/**
 * @param {Number} num
 */
function formatNum(num) {
  return num.toLocaleString("en").replace(",", " ");
}

/**
 * @param {NS} ns
 * @param {Server} server
 */
function logServerInfo(ns, server) {
  const difficultyThreshold = server.baseDifficulty * 2;
  const moneyThreshold = server.moneyMax / 4

  ns.print(
    "[" + server.hostname + "] "
    + "difficulty: " + formatNum(server.hackDifficulty) + " (Threshold: " + formatNum(difficultyThreshold) + ") "
    + "money: " + formatNum(server.moneyAvailable) + " (Threshold: " + formatNum(moneyThreshold) + ")"
  );
}

/**
 * @param {NS} ns
 */
async function getUsableHosts(ns) {
  const hosts = await ns.scan();
  const player = await ns.getPlayer();

  const knownHosts = {};
  const usableHosts = []

  for (let host of hosts) {
    if (!knownHosts[host]) {
      const newHosts = await ns.scan(host);
      knownHosts[host] = true;
      for (let newHost of newHosts) {
        hosts.push(newHost);
      }
    }
  }

  for (let host in knownHosts) {
    const server = await ns.getServer(host);
    if (server.purchasedByPlayer) {
      usableHosts.push(server.hostname)
      continue;
    }

    if (!server.hasAdminRights) {
      //ns.print("[" + host + "] No admin rights")
      if (player.hacking < server.requiredHackingSkill) {
        //ns.print("[" + host + "] requires a hacking level of: " + server.requiredHackingSkill + " current: " + player.hacking);
        continue;
      }
      if (server.numOpenPortsRequired == 2) {
        await ns.ftpcrack(host);
        await ns.brutessh(host);
      } else if (server.numOpenPortsRequired == 1) {
        await ns.brutessh(host);
      } else if (server.numOpenPortsRequired > server.openPortCount) {
        //ns.print("[" + host + "] requires " + server.numOpenPortsRequired + " open ports, current: " + server.openPortCount);
        continue;
      }

      //if (!server.backdoorInstalled) {
      //  await ns.installBackdoor()
      //}

      await ns.nuke(server.hostname);
    }
    usableHosts.push(server.hostname);
  }

  return usableHosts;
}

/**
 * @param {NS} ns
 * @param {string} host
 */
async function copyScripts(ns, host) {
  for (const script of SCRIPTS) {
    if (!await ns.scp(script, host)) {
      return false
    }
  }

  return true
}

/**
 * @param {NS} ns
 * @param {boolean} kill
 */
async function install(ns, kill = true) {
  const player = await ns.getPlayer();
  const usableHosts = await getUsableHosts(ns);

  for (let host of usableHosts) {
    const processes = ns.ps(host);

    ns.print("Installing on: ", host);
    const server = await ns.getServer(host);

    if (host !== "home") {
      if (!await copyScripts(ns, host)) {
        continue;
      }
    }

    if (kill) {
      for (const script of SCRIPTS) {
        await ns.scriptKill(script, host);
      }
    }
  }
}


/**
* @param {NS} ns
* @param {number[]} pids
*/
async function waitForPids(ns, pids) {
  let newPids = pids;
  while (pids.length > 0) {
    for (const pid of pids) {
      if (!await ns.isRunning(pid)) {
        newPids = newPids.filter(v => v != pid);
        ns.print("PID ", pid, " Done!");
      }
    }

    pids = newPids;
    ns.print("Waiting for ", pids.length, " processes to finish");
    await ns.sleep(1000);
  }
}

/**
* @param {NS} ns
* @param {Server} target
* @param {string} script
* @param {number} threads
*/
async function allocateThreads(ns, target, script, threads) {
  const usableHosts = await getUsableHosts(ns);
  const scriptRam = await ns.getScriptRam(script)
  const hosts = [];

  for (const host of usableHosts) {
    const server = await ns.getServer(host);
    hosts.push({ host, ram: server.maxRam - server.ramUsed });
  }

  let threadsRemaining = threads;
  let pids = [];
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
    const pid = await ns.exec(script, host.host, hostThreads, target, hostThreads);
    pids.push(pid);
  }

  return pids
}

/**
* @param {NS} ns
* @param {Server} target
*/
async function getWeakenCommand(ns, target, planSecurity = 0) {
  const requiredReduction = (await ns.getServerSecurityLevel(target.hostname) + planSecurity) - target.minDifficulty;
  const weakenThreads = Math.ceil(requiredReduction / await ns.weakenAnalyze(1));
  const weakenTime = await ns.getWeakenTime(target.hostname);

  return {
    target: target.hostname,
    threads: weakenThreads,
    ram: weakenThreads * await ns.getScriptRam("cmd-weaken.js"),
    time: weakenTime,
    security: 0,
    script: "cmd-weaken.js",
  }
}

/**
* @param {NS} ns
* @param {Server} target
*/
async function getGrowthCommand(ns, target) {
  const growthAmount = target.moneyMax / await ns.getServerMoneyAvailable(target.hostname);
  const growthThreads = Math.ceil(await ns.growthAnalyze(target.hostname, growthAmount));
  const growthTime = await ns.getGrowTime(target.hostname);
  const growthSecurity = await ns.growthAnalyzeSecurity(growthThreads);

  return {
    target: target.hostname,
    threads: growthThreads,
    ram: growthThreads * await ns.getScriptRam("cmd-grow.js"),
    time: growthTime,
    security: growthSecurity,
    script: "cmd-grow.js",
  }
}

/**
* @param {NS} ns
* @param {Server} target
*/
async function getHackCommand(ns, target) {
  const hackAmount = target.moneyMax / 2;
  const hackThreads = Math.ceil(await ns.hackAnalyzeThreads(target.hostname, hackAmount));
  const hackTime = await ns.getHackTime(target.hostname);
  const hackSecurity = await ns.hackAnalyzeSecurity(hackThreads);

  return {
    target: target.hostname,
    threads: hackThreads,
    ram: hackThreads * await ns.getScriptRam("cmd-hack.js"),
    time: hackTime,
    security: hackSecurity,
    script: "cmd-hack.js",
  }
}

/**
* @param {NS} ns
*/
async function runCommand(ns, cmd) {
  if (cmd.threads > 0) {
    ns.print("Running ", cmd.script, " taking ", cmd.time / 1000, " seconds with ", cmd.threads, " threads");
    const pids = await allocateThreads(ns, cmd.target, cmd.script, cmd.threads);
    return pids
  } else {
    ns.print("Got cmd with 0 threads ", cmd);
  }

  return
}

/**
* @param {NS} ns
* @param {Server} target
**/
async function planTarget(ns, target) {
  // Initalise the target
  const growthCommand = await getGrowthCommand(ns, target);
  await runCommand(ns, growthCommand);

  const hackCommand = await getHackCommand(ns, target);
  const weakenCommand = await getWeakenCommand(ns, target, growthCommand.security + hackCommand.security);

  return {
    growth: growthCommand,
    hack: hackCommand,
    weaken: weakenCommand,
    maxThreads: Math.max(growthCommand.threads, hackCommand.threads, weakenCommand.threads),
    maxRam: Math.max(growthCommand.ram, hackCommand.ram, weakenCommand.ram),
  }
}

/**
* @param {NS} ns
* @param {Object} plan
*/
async function runTarget(ns, plan) {
  await runCommand(ns, plan.growth)
  await runCommand(ns, plan.hack)
  await runCommand(ns, plan.weaken)
}

/**
* @param {NS} ns
*/
async function run(ns) {
  const hosts = await getUsableHosts(ns)
  const target = await ns.getServer(TARGET_HOST);

  for (const host of hosts) {
    const processes = await ns.ps(host);
    for (const process of processes) {
      // Already running something planned, so just wait
      if (SCRIPTS.indexOf(process.filename) > -1) {
        return
      }
    }
  }

  if (target.minDifficulty + 1 < target.hackDifficulty) {
    const weaken = await getWeakenCommand(ns, target);
    await runCommand(ns, weaken);
  } else if (target.moneyAvailable < target.moneyMax * 0.9) {
    const growth = await getGrowthCommand(ns, target);
    await runCommand(ns, growth);
  } else {
    const hack = await getHackCommand(ns, target);
    await runCommand(ns, hack);
  }
}

/**
* @param {NS} ns
**/
async function runWIP(ns) {
  const hosts = await getUsableHosts(ns)
  const servers = [];

  for (const host of hosts) {
    const server = await ns.getServer(host);
    servers.push({
      hostname: host,
      ram: server.maxRam - server.ramUsed,
    })
  }


  const totalRam = servers.map(v => v.ram).reduce((p, c) => p + c, 0);
  let remainingRam = totalRam;

  const targetHosts = ["n00dles", "johnson-ortho"];
  const targets = targetHosts.map(async (h) => await ns.getServer(h))
  const tasks = {}

  // Initalise targets
  for (const target of targets) {
    const hack = await getHackCommand(ns, target);
    const weaken = await getWeakenCommand(ns, target);

    remainingRam -= Math.max(hack.ram, weaken.ram);

    if (remainingRam < 0) {
      ns.print("Ran out of ram planning prep for ", target.hostname);
      break;
    }

    tasks[target.hostname] = { hack, weaken }
  }

  let promises = []
  for (const val in tasks) {
    if (!tasks.hasOwnProperty(val)) {
      return;
    }
    promises.push(async function () {
      await runCommand(ns, tasks[val].hack);
      await runCommand(ns, tasks[val].weaken);
    }())
  }

  ns.print("Waiting for prep to finish");
  await Promise.all(promises);

  const target = await ns.getServer("n00dles");
  const plan = await planTarget(ns, target);
  ns.print(plan);
  //await runTarget(ns, plan);
}

/**
* @param {NS} ns
**/
async function buyServers(ns) {
  const limit = await ns.getPurchasedServerLimit()
  const ownedServers = await ns.getPurchasedServers();
  const player = await ns.getPlayer();
  let minRam = 8;

  // Handle finding lowest tier
  let lowestRam = Infinity;
  let lowestRamHost = "";

  for (const host of ownedServers) {
    const server = await ns.getServer(host)
    if (server.maxRam < lowestRam) {
      lowestRam = server.maxRam;
      lowestRamHost = host;
    }
  }

  ns.print("Lowest RAM Host: ", lowestRamHost, " RAM: ", lowestRam, "GiB");

  minRam = lowestRam * 2;

  let ram = minRam;
  const currentMoney = player.money;

  if (currentMoney < await ns.getPurchasedServerCost(ram)) {
    return;
  }

  while (currentMoney >= await ns.getPurchasedServerCost(ram)) {
    ram *= 2;
  }
  ram /= 2;

  if (ownedServers.length >= limit) {
    await ns.killall(lowestRamHost);
    await ns.deleteServer(lowestRamHost);
  }

  await ns.purchaseServer("server-" + ram, ram);
}

/**
* @param {NS} ns
**/
export async function main(ns) {
  const updateExisting = ns.args[0] == "1"
  const persistent = ns.args[1] == "1"

  ns.disableLog("getServerUsedRam");
  ns.disableLog("scan");
  ns.disableLog("sleep");

  if (persistent) {
    while (true) {
      await buyServers(ns);
      await install(ns, updateExisting);
      await run(ns);
      await ns.sleep(1000);
    }
  } else {
    await install(ns);
    await runWIP(ns);
    //await buyServers(ns);
    //await installAndRun(ns, updateExisting);
  }
}