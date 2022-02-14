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

  if (lowestRam === Infinity || ownedServers.length < limit) {
    lowestRam = 8;
  }

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

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
	while (true) {
		await buyServers(ns);
		await ns.sleep(10000);
	}
}