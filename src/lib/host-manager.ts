import { NS } from "@ns"
import ServerWrapper from "/lib/server-wrapper"
import getHosts from "/lib/func/get-hosts"
import { Command, Script } from "/lib/objects"
import { DEPRIORITIZE_HOME } from "/config"

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

  runCommandRaw(opts: RunCommandRawOptions): Array<number> {
    const usableServers = this.getUsableServers()
    if (DEPRIORITIZE_HOME && usableServers.findIndex((s) => s.hostname === "home") > 0) {
      usableServers.push(...usableServers.splice(usableServers.findIndex((s) => s.hostname === "home")))
    }

    const hosts: Array<{ host: string; ram: number }> = []
    const availableThreads = this.getThreadsAvailable(opts.script)

    opts.args ??= []
    opts.fill ??= false

    if (opts.threads === 0) {
      this.ns.print(`ERROR: Received ${opts.script.file} with 0 threads.`)
    }

    if (availableThreads < opts.threads && !opts.fill) {
      this.ns.print(
        `ERROR: Not enough threads available to run ${opts.script.file} with args ${opts.args ?? []} need ${
          opts.threads
        } have ${availableThreads}.`,
      )
      return []
    }

    for (const server of usableServers) {
      hosts.push({ host: server.hostname, ram: server.maxRam - server.getRamUsed() })
    }

    let threadsRemaining = opts.threads

    const pids: Array<number> = []
    while (threadsRemaining > 0) {
      const host = hosts.pop()
      if (!host) {
        this.ns.print(`WARN: Ran out of hosts to run ${opts.script.file}, ${threadsRemaining} not allocated`)
        break
      }

      let hostThreads = Math.floor(host.ram / opts.script.ram)
      if (hostThreads === 0) {
        continue
      }

      if (threadsRemaining < hostThreads) {
        host.ram -= hostThreads * opts.script.ram
        hostThreads = threadsRemaining
        hosts.push(host)
      }

      threadsRemaining -= hostThreads

      const pid = this.ns.exec(
        opts.script.file,
        host.host,
        hostThreads,
        ...opts.args.map((a) => String(a).replace("__HOST_THREADS__", hostThreads.toString())),
      )
      pids.push(pid)
    }

    return pids
  }

  runCommand(cmd: Command, opts: RunCommandOptions = {}): Array<number> {
    opts.args ??= []
    opts.fill ??= false

    return this.runCommandRaw({
      script: cmd.script,
      threads: cmd.threads,
      fill: opts.fill ?? false,
      args: ["--target", cmd.target, ...opts.args],
    })
  }
}

export interface RunCommandRawOptions {
  script: Script
  threads: number
  fill?: boolean // If true ignore lack of space available
  args?: Array<string | number>
}

interface RunCommandOptions {
  fill?: boolean // If true ignore lack of space available
  args?: Array<string | number>
}
