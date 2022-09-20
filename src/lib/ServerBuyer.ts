import { NS, Server } from "@ns"
import { LOG_LEVEL } from "/config"
import { CONSTANTS } from "/game-constants"
import { getMoneyToReserve } from "/lib/func/get-money-to-reserve"
import { getGlobalState } from "/lib/shared/GlobalStateManager"
import Logger from "/lib/Logger"
import { LogLevel } from "/lib/objects"
//import { SerializedDaemonStatus } from "/lib/objects"
import { formatGiB, formatMoney } from "/lib/util"

export default class ServerBuyer {
  ns: NS
  minRam: number
  log: Logger

  constructor(ns: NS, minRam = 8) {
    this.ns = ns
    this.minRam = minRam
    this.log = new Logger(ns, LOG_LEVEL, "ServerBuyer")
  }

  getPurchasedServers(): Array<Server> {
    return this.ns.getPurchasedServers().map((h) => this.ns.getServer(h))
  }

  getLowestRamHosts(): { servers: Array<Server>; ram: number } {
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
    while (buyRam < CONSTANTS.PurchasedServerMaxRam && money / 2 >= this.ns.getPurchasedServerCost(buyRam)) {
      buyRam *= 2
    }
    this.log.debug(
      "Highest tier affordable is %dGiB of RAM for %s",
      buyRam,
      formatMoney(this.ns, this.ns.getPurchasedServerCost(buyRam)),
    )
    return buyRam
  }

  async buy(nextstep = false): Promise<boolean> {
    this.log.debug("Attempting to buy server, nextstep: %s", nextstep ? "true" : "false")
    const limit = this.ns.getPurchasedServerLimit()
    const ownedServers = this.getPurchasedServers()
    const player = this.ns.getPlayer()
    const currentMoney = Math.max(0, player.money - getMoneyToReserve(this.ns))
    let buyRam = this.minRam

    if (limit === 0) {
      this.log.debug("Server limit is 0, not buying")
      return false
    }

    // If we're not at the limit just buy the lowest tier
    if (ownedServers.length < limit) {
      if (currentMoney < this.ns.getPurchasedServerCost(this.minRam)) {
        this.log.debug("Cheapest server costs more than available money, can't buy")
        return false
      }

      if (!nextstep) {
        buyRam = this.getHighestTierAffordable(currentMoney)
        if (buyRam < this.minRam) {
          this.log.debug("buyRam %.2f is less than minRam %.2f, can't buy", buyRam, this.minRam)
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

    if (lowestHosts.ram >= CONSTANTS.PurchasedServerMaxRam) {
      this.log.info("All servers are max tier, doing nothing.")
      return false
    }

    buyRam = nextstep ? lowestHosts.ram * 2 : this.getHighestTierAffordable(currentMoney)

    if (currentMoney < this.ns.getPurchasedServerCost(buyRam)) {
      return false
    }

    if (buyRam <= lowestHosts.ram) {
      this.log.debug("buyRam %.2f is less than or equal to lowest host RAM %.2f, can't buy", buyRam, lowestHosts.ram)
      return false
    }

    if (ownedServers.length >= limit) {
      // First look for any owned servers of the lowest tier that are idle, if found delete it
      const emptyServer = lowestHosts.servers.find((s) => this.ns.ps(s.hostname).length === 0)
      if (emptyServer) {
        this.deleteServer(emptyServer)
        return this.buyServer(buyRam)
      }

      // If not pick a random one from the lowest tier, drain and delete it
      const server = lowestHosts.servers[Math.floor(Math.random() * lowestHosts.servers.length)]
      await this.drainAndWait(server.hostname)
      this.deleteServer(server)
    }

    return this.buyServer(buyRam)
  }

  async drainAndWait(hostname: string): Promise<void> {
    const drainingServers = getGlobalState().drainingServers
    drainingServers.add(hostname)

    while (this.ns.ps(hostname).length !== 0) {
      this.log.debug(`Waiting for ${hostname} to drain...`)
      await this.ns.asleep(1000)
    }

    drainingServers.delete(hostname)
  }

  deleteServer(server: Server) {
    this.ns.killall(server.hostname)
    this.ns.deleteServer(server.hostname)
    this.log.info("Deleted old server %s with %s RAM", server.hostname, formatGiB(this.ns, server.maxRam))
  }

  buyServer(ram: number): boolean {
    const hostname = this.ns.purchaseServer("zserv", ram)

    if (hostname !== "") {
      this.log.logAndToast(
        LogLevel.Info,
        "Bought server %s with %s RAM for %s",
        hostname,
        formatGiB(this.ns, ram),
        formatMoney(this.ns, this.ns.getPurchasedServerCost(ram)),
      )
    }

    return hostname !== ""
  }
}
