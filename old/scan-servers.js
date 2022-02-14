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

async function getHackableHosts(ns) {
  const player = await ns.getPlayer();
  const knownHosts = await scanHost(ns, {}, [], "home");
  const usableHosts = []

  await ns.print(Object.keys(knownHosts));

  for (let host in knownHosts) {
    const server = await ns.getServer(host);
    if (server.purchasedByPlayer) {
      continue;
    }

    if (server.hasAdminRights) {
      usableHosts.push(server.hostname);
    }
  }

  return usableHosts;
}

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("scan");
  const hosts = await getHackableHosts(ns);
  const results = []
  for (const host of hosts) {
    const server = await ns.getServer(host)
    const score = server.minDifficulty * server.moneyMax * server.serverGrowth / 1000000;
    results.push({ host, diff: server.minDifficulty, currDiff: server.baseDifficulty, max: server.moneyMax, grow: server.serverGrowth, score });
  }

  for (const result of results.sort((a, b) => b.score - a.score)) {
    ns.print(ns.sprintf("%30s | %3d | %3d | %12d | %5d | %5.2d", result.host, result.diff, result.currDiff, result.max, result.grow, result.score))
  }
}