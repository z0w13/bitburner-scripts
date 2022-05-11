import { NS } from "@ns"
import ServerWrapper from "/lib/ServerWrapper"
import getHosts from "/lib/func/get-hosts"
import Script from "/lib/Script"

export default class HostManager {
  private ns: NS
  private servers: Record<string, ServerWrapper>
  private serversLastUpdated: number

  constructor(ns: NS) {
    this.ns = ns
    this.servers = {}
    this.serversLastUpdated = Date.now()

    getHosts(this.ns).forEach((h) => (this.servers[h] = new ServerWrapper(this.ns, h)))
  }

  updateServers() {
    // Only update if server list hasn't been in 30 seconds
    if (Date.now() - this.serversLastUpdated > 30 * 1000) {
      // Update hosts with new data
      getHosts(this.ns).forEach((h) => (this.servers[h] = new ServerWrapper(this.ns, h)))
      // Remove deleted hosts
      Object.keys(this.servers).forEach((h) => this.ns.serverExists(h) || delete this.servers[h])
    }
  }

  getServers(): Array<ServerWrapper> {
    this.updateServers()
    return Object.values(this.servers)
  }

  getUsableServers(): Array<ServerWrapper> {
    return this.getServers().filter((s) => s.isSetup() && !s.isDraining())
  }

  getRecommendedServers(): Array<ServerWrapper> {
    return this.getServers().filter((s) => s.isRecommendedTarget().recommended)
  }

  hasServer(hostname: string): boolean {
    return hostname in this.servers || this.ns.serverExists(hostname)
  }

  getServer(hostname: string): ServerWrapper | undefined {
    this.updateServers()
    if (!this.ns.serverExists(hostname)) {
      return undefined
    }

    return this.servers[hostname] || (this.servers[hostname] = new ServerWrapper(this.ns, hostname))
  }

  getTargetableServers(): Array<ServerWrapper> {
    return this.getServers().filter((s) => s.isTargetable())
  }

  getCurrentLoad(): number {
    return this.getUsedRam() / this.getTotalRam()
  }

  getRamAvailable(): number {
    return this.getTotalRam() - this.getUsedRam()
  }

  getTotalRam(): number {
    return this.getUsableServers()
      .map((s) => s.maxRam)
      .reduce((acc, val) => acc + val, 0)
  }

  getUsedRam(): number {
    return this.getUsableServers()
      .map((s) => s.getRamUsed())
      .reduce((acc, val) => acc + val, 0)
  }

  getThreadsAvailable(script: Script): number {
    const setupHosts = this.getUsableServers()

    let threads = 0

    for (const server of setupHosts) {
      threads += Math.floor((server.maxRam - server.getRamUsed()) / script.ram)
    }

    return threads
  }
}
