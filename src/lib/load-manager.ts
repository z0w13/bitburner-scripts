import { NS } from "@ns"
import ServerWrapper from "/lib/server-wrapper"
import scanHost from "/lib/scan-host"
import { Command, Script } from "/lib/objects"

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
    return Object.values(this.servers).filter((s) => s.isSetup() && !s.isDraining())
  }

  getRecommendedServers(): Array<ServerWrapper> {
    return Object.values(this.servers).filter((s) => s.isRecommendedTarget().recommended)
  }

  getserver(hostname: string): ServerWrapper {
    return this.servers[hostname] || (this.servers[hostname] = new ServerWrapper(this.ns, hostname))
  }

  getTargetableServers(): Array<ServerWrapper> {
    return Object.values(this.servers).filter((s) => s.isTargetable())
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
      args: ["--target", cmd.target.hostname, "--threads", "__HOST_THREADS__", ...opts.args],
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
