import { NS, Server } from "@ns"
import { LOG_LEVEL } from "/config"
import { CONSTANTS } from "/game-constants"
import { getMoneyToReserve } from "/lib/func/get-money-to-reserve"
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

  getServerToBuy(nextStep = false): { replace?: string; cost: number; ram: number } | undefined {
    const limit = this.ns.getPurchasedServerLimit()
    const ownedServers = this.getPurchasedServers()
    const player = this.ns.getPlayer()
    const currentMoney = Math.max(0, player.money - getMoneyToReserve(this.ns))
    let buyRam = this.minRam

    if (limit === 0) {
      return
    }

    if (ownedServers.length < limit) {
      if (currentMoney < this.ns.getPurchasedServerCost(this.minRam)) {
        return
      }

      if (!nextStep) {
        buyRam = this.getHighestTierAffordable(currentMoney)
        if (buyRam < this.minRam) {
          return
        }
      }

      return { cost: this.ns.getPurchasedServerCost(buyRam), ram: buyRam }
    }

    const lowestHosts = this.getLowestRamHosts()
    if (lowestHosts.servers.length === 0) {
      this.log.error("lowestHosts is empty, shouldn't happen tbh")
      return
    }

    if (lowestHosts.ram >= CONSTANTS.PurchasedServerMaxRam) {
      this.log.info("All servers are max tier.")
      return
    }

    buyRam = nextStep ? lowestHosts.ram * 2 : this.getHighestTierAffordable(currentMoney)
    if (currentMoney < this.ns.getPurchasedServerCost(buyRam)) {
      return
    }

    if (buyRam <= lowestHosts.ram) {
      this.log.debug("buyRam %.2f is less than or equal to lowest host RAM %.2f, can't buy", buyRam, lowestHosts.ram)
      return
    }

    if (ownedServers.length >= limit) {
      // First look for any owned servers of the lowest tier that are idle, if found delete it
      const emptyServer = lowestHosts.servers.find((s) => this.ns.ps(s.hostname).length === 0)
      if (emptyServer) {
        return {
          replace: emptyServer.hostname,
          cost: this.ns.getPurchasedServerCost(buyRam),
          ram: buyRam,
        }
      }

      // If not pick a random one from the lowest tier, drain and delete it
      const server = lowestHosts.servers[Math.floor(Math.random() * lowestHosts.servers.length)]
      return {
        replace: server.hostname,
        cost: this.ns.getPurchasedServerCost(buyRam),
        ram: buyRam,
      }
    }

    return
  }

  async buy(nextStep = false): Promise<boolean> {
    const toBuy = this.getServerToBuy(nextStep)
    if (!toBuy) {
      return false
    }

    if (toBuy.replace) {
      this.deleteServer(toBuy.replace)
    }

    while (this.ns.getPlayer().money < toBuy.cost) {
      await this.ns.asleep(1000)
    }

    return this.buyServer(toBuy.ram)
  }

  deleteServer(hostname: string) {
    const ram = this.ns.getServer(hostname).maxRam

    this.ns.killall(hostname)
    this.ns.deleteServer(hostname)
    this.log.info("Deleted old server %s with %s RAM", hostname, formatGiB(this.ns, ram))
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
