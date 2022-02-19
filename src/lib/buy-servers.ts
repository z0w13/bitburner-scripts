import { NS } from "@ns"
import { LOG_LEVEL } from "/config"
import Logger from "/lib/logger"
import { SerializedDaemonStatus } from "/lib/objects"
import ServerWrapper from "/lib/server-wrapper"

const MAX_RAM = 1048576

export default class ServerBuyer {
  ns: NS
  minRam: number
  log: Logger

  constructor(ns: NS, minRam = 8) {
    this.ns = ns
    this.minRam = minRam
    this.log = new Logger(ns, LOG_LEVEL, "ServerBuyer")
  }

  getPurchasedServers(): Array<ServerWrapper> {
    return this.ns.getPurchasedServers().map((h) => new ServerWrapper(this.ns, h))
  }

  getLowestRamHosts(): { servers: Array<ServerWrapper>; ram: number } {
    const servers = this.getPurchasedServers()
    if (servers.length === 0) {
      return { servers: [], ram: 0 }
    }

    // Handle finding lowest tier
    const lowestRam = Math.min(...servers.map((s) => s.maxRam))
    return { servers: servers.filter((s) => s.maxRam === lowestRam), ram: lowestRam }
  }

  getHighestTierAffordable(money: number): number {
    let buyRam = 1
    while (buyRam < MAX_RAM && money / 2 >= this.ns.getPurchasedServerCost(buyRam)) {
      buyRam *= 2
    }
    return buyRam
  }

  async buy(nextstep = false): Promise<boolean> {
    const limit = this.ns.getPurchasedServerLimit()
    const ownedServers = this.getPurchasedServers()
    const player = this.ns.getPlayer()
    const currentMoney = player.money
    let buyRam = this.minRam

    // If we're not at the limit just buy the lowest tier
    if (ownedServers.length < limit) {
      if (currentMoney < this.ns.getPurchasedServerCost(this.minRam)) {
        return false
      }

      if (!nextstep) {
        buyRam = this.getHighestTierAffordable(currentMoney)
        if (buyRam < this.minRam) {
          return false
        }
      }

      return this.buyServer(buyRam)
    }

    const lowestHosts = this.getLowestRamHosts()
    if (lowestHosts.servers.length === 0) {
      this.log.error("lowestHosts is empty, shouldn't happen tbh")
      return false
    }

    if (lowestHosts.ram >= MAX_RAM) {
      this.log.info("All servers are max tier, doing nothing.")
      return false
    }

    buyRam = lowestHosts.ram * 2

    if (currentMoney < this.ns.getPurchasedServerCost(buyRam)) {
      return false
    }

    if (!nextstep) {
      this.getHighestTierAffordable(currentMoney)
    }

    if (ownedServers.length >= limit) {
      const data = JSON.parse(this.ns.read("jobs.json.txt")) as SerializedDaemonStatus
      // First look for any owned servers of the lowest tier that are idle, if found delete it
      for (const server of lowestHosts.servers) {
        if (server.getProcesses().length > 0 || data.jobs.findIndex((j) => j.target === server.hostname) > -1) {
          continue
        }

        this.ns.killall(server.hostname)
        this.ns.deleteServer(server.hostname)
        this.log.info(
          "Deleted old server %s with %s RAM",
          server.hostname,
          this.ns.nFormat(server.maxRam * 1024 ** 3, "0.00ib"),
        )
        return this.buyServer(buyRam)
      }

      // If not pick a random one from the lowest tier, drain and delete it
      const server = lowestHosts.servers[Math.floor(Math.random() * lowestHosts.servers.length)]
      if (!server.isDraining()) {
        await server.drain()
      }

      while (data.jobs.findIndex((j) => j.target === server.hostname) > -1 && !server.isDrained()) {
        await server.waitTillDrained()
        await this.ns.asleep(1000)
      }

      this.ns.killall(server.hostname)
      this.ns.deleteServer(server.hostname)
      this.log.info(
        "Deleted old server %s with %s RAM",
        server.hostname,
        this.ns.nFormat(server.maxRam * 1024 ** 3, "0.00ib"),
      )
    }

    return this.buyServer(buyRam)
  }

  buyServer(ram: number): boolean {
    const hostname = this.ns.purchaseServer("zserv", ram)
    if (hostname !== "") {
      this.log.info(
        "Bought server %s with %s RAM for %s",
        hostname,
        this.ns.nFormat(ram * 1024 ** 3, "0.00ib"),
        this.ns.nFormat(this.ns.getPurchasedServerCost(ram), "$0,0.00a"),
      )
    }

    return hostname !== ""
  }
}
