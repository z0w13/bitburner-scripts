const SCRIPTS = ["cmd-grow.js", "cmd-weaken.js", "cmd-hack.js"];
const TARGET_HOST = "the-hub";

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
    if (server.hasAdminRights) {
      usableHosts.push(server.hostname);
    }
  }

  return usableHosts;
}


/**
* @param {NS} ns
**/
async function printStatus(ns) {
  const hosts = await getUsableHosts(ns)
  const hostLength = hosts.map(h => h.length).sort((a, b) => b - a).at(0);

  let server = await ns.getServer(TARGET_HOST);
  ns.print(ns.sprintf(
    "%" + hostLength + "s | %12s (%6s)| %5s (%7s)",
    "Target",
    "Money",
    "%Max",
    "Diff",
    "%Base"
  ));
  ns.print(ns.sprintf(
    "%" + hostLength + "s | %12.2f (%5.2f%%)| %5.2f (%6.2f%%)",
    TARGET_HOST,
    server.moneyAvailable,
    server.moneyMax ? (server.moneyAvailable / server.moneyMax) * 100 : 0,
    server.hackDifficulty,
    server.baseDifficulty ? ((server.hackDifficulty / server.baseDifficulty) + 1) * 100 : 0,
  ));

  ns.print("=========================================================");

  ns.print(ns.sprintf(
    "%" + hostLength + "s | %6s | %5s | %12s | %8s | %s",
    "Host",
    "PID",
    "Thr",
    "Money",
    "Exp",
    "Log",
  ));

  let totalExp = 0;
  let totalMoney = 0;
  let totalThreads = 0;
  for (const host of hosts) {
    const processes = await ns.ps(host);

    let hackProcess;
    for (const process of processes) {
      if (SCRIPTS.indexOf(process.filename) > -1) {
        hackProcess = process
        break;
      }
    }

    let exp = 0;
    let money = 0;
    let logs = ["Idle"];

    if (hackProcess) {
      exp = await ns.getScriptExpGain(hackProcess.filename, host, ...hackProcess.args);
      money = await ns.getScriptIncome(hackProcess.filename, host, ...hackProcess.args);
      logs = await ns.getScriptLogs(hackProcess.filename, host, ...hackProcess.args);
      totalThreads += hackProcess.threads
    }

    totalExp += exp
    totalMoney += money

    ns.print(ns.sprintf(
      "%" + hostLength + "s | %6s | %5s | %12.2f | %8.2f | %s",
      host,
      hackProcess ? hackProcess.pid : "",
      hackProcess ? hackProcess.threads : "",
      money,
      exp,
      logs.at(-1) ?? "",
    ));


    //ns.print(host, " | money: ", formatNum(server.moneyAvailable), " | difficulty: ", ns.nFormat(server.hackDifficulty, "0.00"));
  }
  ns.print(ns.sprintf(
    "%" + hostLength + "s | %6s | %5d | %12.2f | %8.2f |",
    "Total (" + hosts.length + ")",
    "",
    totalThreads,
    totalMoney,
    totalExp,
  ));

}

/**
* @param {NS} ns
**/
export async function main(ns) {
  ns.disableLog("getServerUsedRam");
  ns.disableLog("scan");
  ns.disableLog("sleep");

  while (true) {
    ns.clearLog();
    await printStatus(ns);
    await ns.sleep(1000);
  }
}