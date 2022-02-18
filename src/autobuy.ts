import { NS } from "@ns"
import { SerializedDaemonStatus } from "/lib/objects"
import ServerWrapper from "/lib/server-wrapper"

const MAX_RAM = 1048576

export async function main(ns: NS): Promise<void> {
  ns.disableLog("sleep")
  const flags = ns.flags([
    ["nextstep", false], // Only go to the next power of 2 up until everything's upgraded
    ["interval", 1000], // How long to sleep inbetween buy actions
    ["min-ram", 8], // Lowest ram servers to buy
  ])

  while (true) {
    await buyServers(ns, flags["nextstep"], flags["min-ram"])
    await ns.sleep(flags["interval"])
  }
}

async function getLowestRamHost(ns: NS, servers: Array<string>): Promise<{ host: string; ram: number } | null> {
  if (servers.length === 0) {
    return null
  }

  // Handle finding lowest tier
  let lowestRam = Infinity
  let lowestRamHost = ""

  for (const host of servers) {
    const server = ns.getServer(host)
    if (server.maxRam < lowestRam) {
      lowestRam = server.maxRam
      lowestRamHost = host
    }
  }

  return { host: lowestRamHost, ram: lowestRam }
}

async function buyServers(ns: NS, nextstep = false, minRam = 8): Promise<void> {
  const limit = ns.getPurchasedServerLimit()
  const ownedServers = ns.getPurchasedServers()
  const player = ns.getPlayer()
  const currentMoney = player.money
  let buyRam = minRam

  // If we're not at the limit just buy the lowest tier
  if (ownedServers.length < limit) {
    if (currentMoney < ns.getPurchasedServerCost(minRam)) {
      return
    }

    if (!nextstep) {
      buyRam = getHighestTierAffordable(ns, currentMoney)
      if (buyRam < minRam) {
        return
      }
    }

    ns.purchaseServer("zserv", buyRam)
    return
  }

  const lowestHost = await getLowestRamHost(ns, ownedServers)
  if (!lowestHost) {
    ns.print("ERROR: lowestHost is null, shouldn't happen tbh")
    return
  }

  if (lowestHost.ram >= MAX_RAM) {
    ns.print("All servers are max tier")
    ns.exit()
  }

  buyRam = lowestHost.ram * 2

  if (currentMoney < ns.getPurchasedServerCost(buyRam)) {
    return
  }

  if (!nextstep) {
    getHighestTierAffordable(ns, currentMoney)
  }

  if (ownedServers.length >= limit) {
    const data = JSON.parse(ns.read("jobs.json.txt")) as SerializedDaemonStatus
    const server = new ServerWrapper(ns, lowestHost.host)

    if (!server.isDraining()) {
      await server.drain()
    }

    while (data.jobs.findIndex((j) => j.target === server.hostname) > -1 && !server.isDrained()) {
      await server.waitTillDrained()
      await ns.asleep(1)
    }

    ns.killall(lowestHost.host)
    ns.deleteServer(lowestHost.host)
  }

  const hostname = ns.purchaseServer("zserv", buyRam)
  if (hostname !== "") {
    ns.tprintf("Bought server %s with %s RAM", hostname, ns.nFormat(buyRam * 1024 ** 3, "0.00ib"))
  }
}

function getHighestTierAffordable(ns: NS, money: number): number {
  let buyRam = 1
  while (buyRam < MAX_RAM && money / 2 >= ns.getPurchasedServerCost(buyRam)) {
    buyRam *= 2
  }
  return buyRam
}
