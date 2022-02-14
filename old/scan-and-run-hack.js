const TARGET_HOSTS = ["the-hub", "iron-gym", "n00dles"]
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
 * @param {Object} seenHosts
 * @param []string chain
 * @param string host
 **/
async function scanHost(ns, seenHosts = {}, chain, targetHost) {
  seenHosts[targetHost] = chain

  const foundHosts = ns.scan(targetHost);
  for (const host of foundHosts) {
    if (!seenHosts[host]) {
      await scanHost(ns, seenHosts, chain.concat([targetHost]), host) ;
    }
  }

  return seenHosts;
}

/**
 * @param {NS} ns
 */
async function getUsableHosts(ns) {
  const player = await ns.getPlayer();
  const knownHosts = await scanHost(ns, {}, [], "home");
  const usableHosts = [];

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

      switch(server.numOpenPortsRequired) {
        case 5:
          if (ns.fileExists("SQLInject.exe") && !server.sqlPortOpen) {
            ns.sqlinject(host);
          }
        case 4:
          if (ns.fileExists("HTTPWorm.exe") && !server.httpPortOpen) {
            ns.httpworm(host);
          }
        case 3:
          if (ns.fileExists("SMTPRelay.exe") && !server.smtpPortOpen) {
            ns.relaysmtp(host);
          }
        case 2:
          if (ns.fileExists("FTPCrack.exe") && !server.ftpPortOpen) {
            ns.ftpcrack(host);
          }
        case 1:
          if (ns.fileExists("BruteSSH.exe") && !server.sshPortOpen) {
            ns.brutessh(host);
          }
      }

      if (server.numOpenPortsRequired > server.openPortCount) {
        continue;
      }

      ns.nuke(server.hostname);
    }

    if (server.maxRam === 0) {
      continue;
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
    if (host !== "home") {
      if (!await copyScripts(ns, host)) {
        continue;
      }
    }

    if (kill) {
      for (const script of SCRIPTS) {
        ns.scriptKill(script, host);
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
    let availRam = server.maxRam - server.ramUsed;
    if (host === "home") {
      availRam /= 2;
    }
    
    hosts.push({ host, ram: availRam });
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
  const moneyAvailable = await ns.getServerMoneyAvailable(target.hostname);
  const growthAmount = target.moneyMax / moneyAvailable
  const growthThreads = moneyAvailable > 0 ? Math.ceil(await ns.growthAnalyze(target.hostname, growthAmount)) : 0;
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
async function getTotalRamAvailable(ns) {
  return (await getUsableHosts(ns)).map(h => {
    return ns.getServer(h);
  }).map(s => {
    return s.maxRam - s.ramUsed;
  }).reduce((p, c) => p + c, 0);
}

/**
* @param {NS} ns
* @return {Server}
*/
async function getViableTarget(ns) {
  const player = await ns.getPlayer();
  if (player.hacking < 300) {
    return await ns.getServer("n00dles");
  }

  for (const host of TARGET_HOSTS) {
    const target = await ns.getServer(host);
    if (target.hasAdminRights) {
      return target;
    }
  }
}

/**
* @param {NS} ns
*/
async function run(ns) {
  const hosts = await getUsableHosts(ns)
  const target = await getViableTarget(ns)

  for (const host of hosts) {
    const processes = await ns.ps(host);
    for (const process of processes) {
      // Already running something planned, so just wait
      if (SCRIPTS.indexOf(process.filename) > -1) {
        return
      }
    }
  }

  const totalRam = await getTotalRamAvailable(ns)
  if (target.minDifficulty + 1 < target.hackDifficulty) {
    const weaken = await getWeakenCommand(ns, target);
    weaken.threads = Math.floor(totalRam / ns.getScriptRam("cmd-weaken.js"));
    await runCommand(ns, weaken);
  } else if (target.moneyAvailable < target.moneyMax * 0.9) {
    const growth = await getGrowthCommand(ns, target);
    growth.threads = Math.floor(totalRam / ns.getScriptRam("cmd-grow.js"));
    await runCommand(ns, growth);
  } else {
    const hack = await getHackCommand(ns, target);
    await runCommand(ns, hack);
  }
}

/**
* @param {NS} ns
**/
export async function main(ns) {
  const updateExisting = ns.args[0] == "1"

  ns.disableLog("getServerUsedRam");
  ns.disableLog("scan");
  ns.disableLog("sleep");
  ns.disableLog("scp");
  ns.disableLog("exec");


  while (true) {
    await install(ns, updateExisting);
    await run(ns);

    await ns.sleep(1000);
  }
}