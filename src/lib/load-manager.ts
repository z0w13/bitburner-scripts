import { NS } from "@ns"
import ServerWrapper from "/lib/server-wrapper"
import scanHost from "/lib/scan-host"

export default class LoadManager {
  ns: NS
  servers: Record<string, ServerWrapper>

  constructor(ns: NS) {
    this.ns = ns
    this.servers = {}

    Object.keys(scanHost(this.ns)).forEach((h) => (this.servers[h] = new ServerWrapper(this.ns, h)))
  }

  getServers(): Array<ServerWrapper> {
    return Object.values(this.servers)
  }

  getUsableServers(): Array<ServerWrapper> {
    return Object.values(this.servers).filter((s) => s.isSetup())
  }

  getTargetServers(): Array<ServerWrapper> {
    return Object.values(this.servers).filter((s) => s.isRecommendedTarget().recommended)
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
}
