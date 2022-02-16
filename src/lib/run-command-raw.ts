import { NS } from "@ns"
import getSetupHosts from "/lib/get-setup-hosts"
import getThreadsAvailable from "/lib/get-threads-available"

interface RunCommandRawOptions {
  script: string
  threads: number
  fill?: boolean // If true ignore lack of space available
  args?: Array<string | number>
}

export default function runCommand(ns: NS, opts: RunCommandRawOptions): Array<number> {
  const usableHosts = getSetupHosts(ns)
  const scriptRam = ns.getScriptRam(opts.script)
  const hosts: Array<{ host: string; ram: number }> = []
  const availableThreads = getThreadsAvailable(ns, opts.script)

  opts.args ??= []
  opts.fill ??= false

  if (opts.threads === 0) {
    ns.print(`ERROR: Received ${opts.script} with 0 threads.`)
  }

  if (getThreadsAvailable(ns, opts.script) < opts.threads && !opts.fill) {
    ns.print(
      `ERROR: Not enough threads available to run ${opts.script} with args ${opts.args ?? []} need ${
        opts.threads
      } have ${availableThreads}.`,
    )
    return []
  }

  for (const host of usableHosts) {
    const server = ns.getServer(host)
    hosts.push({ host, ram: server.maxRam - server.ramUsed })
  }

  let threadsRemaining = opts.threads

  const pids: Array<number> = []
  while (threadsRemaining > 0) {
    const host = hosts.pop()
    if (!host) {
      ns.print(`WARN: Ran out of hosts to run ${opts.script}, ${threadsRemaining} not allocated`)
      break
    }

    let hostThreads = Math.floor(host.ram / scriptRam)
    if (hostThreads === 0) {
      continue
    }

    if (threadsRemaining < hostThreads) {
      host.ram -= hostThreads * scriptRam
      hostThreads = threadsRemaining
      hosts.push(host)
    }

    threadsRemaining -= hostThreads

    const pid = ns.exec(
      opts.script,
      host.host,
      hostThreads,
      ...opts.args.map((a) => String(a).replace("__HOST_THREADS__", hostThreads.toString())),
    )
    pids.push(pid)
  }

  return pids
}