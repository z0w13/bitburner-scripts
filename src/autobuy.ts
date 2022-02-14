import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
  ns.disableLog("sleep");
  const flags = ns.flags([
    ["nextstep", false], // Only go to the next power of 2 up until everything's upgraded
    ["interval", 1000], // How long to sleep inbetween buy actions
    ["min-ram", 8], // Lowest ram servers to buy
  ])

  while (true) {
    await buyServers(ns, flags["nextstep"], flags["min-ram"]);
    await ns.sleep(flags["interval"]);
  }
}

async function getLowestRamHost(ns: NS, servers: Array<string>) : Promise<{host: string, ram: number} | null> {
  if (servers.length === 0) {
    return null
  }

  // Handle finding lowest tier
  let lowestRam = Infinity;
  let lowestRamHost = "";

  for (const host of servers) {
    const server = await ns.getServer(host)
    if (server.maxRam < lowestRam) {
      lowestRam = server.maxRam;
      lowestRamHost = host;
    }
  }

  return {host: lowestRamHost, ram: lowestRam};
}

async function buyServers(ns: NS, nextstep = false, minRam = 8): Promise<void> {
  const limit = await ns.getPurchasedServerLimit()
  const ownedServers = await ns.getPurchasedServers();
  const player = await ns.getPlayer();
  const currentMoney = player.money;
  let buyRam = minRam;

  // If we're not at the limit just buy the lowest tier
  if (ownedServers.length < limit) {
    if (currentMoney < await ns.getPurchasedServerCost(minRam)) {
      return;
    }

    await ns.purchaseServer("server-" + buyRam, buyRam);
    return;
  }


  const lowestHost = await getLowestRamHost(ns, ownedServers);
  if (!lowestHost) {
    ns.print("ERROR: lowestHost is null, shouldn't happen tbh");
    return;
  }

  buyRam = lowestHost.ram * 2;

  if (currentMoney < await ns.getPurchasedServerCost(buyRam)) {
    return;
  }

  if (!nextstep) {
    // We divide currentMoney by 2 so we don't have to divide ram by 2 after
    while ((currentMoney/2) >= await ns.getPurchasedServerCost(buyRam)) {
      buyRam *= 2;
    }
  }

  if (ownedServers.length >= limit) {
    await ns.killall(lowestHost.host);
    await ns.deleteServer(lowestHost.host);
  }

  await ns.purchaseServer("server-" + buyRam, buyRam);
}