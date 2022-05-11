import { NS } from "@ns"
import getSetupHosts from "/lib/func/get-setup-hosts"
import getThreadsAvailable from "/lib/func/get-threads-available"
import Script from "/lib/Script"

interface RunCommandRawOptions {
  script: Script
  threads: number
  host?: string
  fill?: boolean // If true ignore lack of space available
  args?: Array<string | number | boolean>
}

export default function runCommandRaw(ns: NS, opts: RunCommandRawOptions): Array<number> {
  const usableHosts = opts.host ? [opts.host] : getSetupHosts(ns)
  const hosts: Array<{ host: string; ram: number }> = []
  const availableThreads = getThreadsAvailable(ns, opts.script)

  opts.args ??= []
  opts.fill ??= false

  if (opts.threads === 0) {
    ns.print(`ERROR: Received ${opts.script.file} with 0 threads.`)
  }

  if (getThreadsAvailable(ns, opts.script) < opts.threads && !opts.fill) {
    ns.print(
      `ERROR: Not enough threads available to run ${opts.script.file} with args ${opts.args ?? []} need ${
        opts.threads
      } have ${availableThreads}.`,
    )
    return []
  }

  for (const host of usableHosts) {
    const server = ns.getServer(host)
    if (server.maxRam === 0) {
      continue
    }

    hosts.push({ host, ram: server.maxRam - server.ramUsed })
  }

  let threadsRemaining = opts.threads

  const pids: Array<number> = []
  while (threadsRemaining > 0) {
    const host = hosts.pop()
    if (!host) {
      ns.print(`WARN: Ran out of hosts to run ${opts.script.file}, ${threadsRemaining} not allocated`)
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

    const pid = ns.exec(
      opts.script.file,
      host.host,
      hostThreads,
      ...opts.args.map((a) => String(a).replace("__HOST_THREADS__", hostThreads.toString())),
    )
    if (pid === 0) {
      ns.print(
        ns.sprintf(
          "Something went wrong, couldn't start %s with %d threads on %s",
          opts.script.file,
          hostThreads,
          host.host,
        ),
      )
    }

    pids.push(pid)
  }

  return pids
}
