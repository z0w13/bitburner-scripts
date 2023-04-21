import type { NS } from "@ns"
import { DAEMON_SERVER } from "@/config"
import getSetupHosts from "@/lib/func/get-setup-hosts"

async function setup(ns: NS, usableHosts: ReadonlyArray<string>): Promise<void> {
  for (const host of usableHosts) {
    ns.tprint(`Setting up ${host}`)

    if (!ns.fileExists("stanek.js", host)) {
      ns.scp(["stanek.js"], host, DAEMON_SERVER)
    }
  }
}

function start(ns: NS, usableHosts: ReadonlyArray<string>): void {
  let totalThreads = 0
  for (const host of usableHosts) {
    if (!ns.getRunningScript("stanek.js", host)) {
      const maxThreads = Math.floor(
        (ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ns.getScriptRam("stanek.js", DAEMON_SERVER),
      )

      if (maxThreads === 0) {
        continue
      }

      ns.exec("stanek.js", host, maxThreads)
      ns.tprint(`Started stanek charging on ${host} with ${ns.formatNumber(maxThreads, 0)} threads`)
      totalThreads += maxThreads
    } else {
      const script = ns.getRunningScript("stanek.js", host)
      if (!script) {
        continue
      }

      totalThreads += script.threads
    }
  }

  ns.tprint(`Stanek charging with ${ns.formatNumber(totalThreads)} total threads`)
}

function stop(ns: NS, usableHosts: ReadonlyArray<string>): void {
  let found = 0
  let killed = 0
  for (const host of usableHosts) {
    const script = ns.getRunningScript("stanek.js", host)
    if (script) {
      found++
      killed += ns.kill(script.pid) ? 1 : 0
    }
  }

  ns.tprint(`Killed ${killed}/${found} stanek scripts`)
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  const command = ns.args[0] ?? "start"

  const usableHosts = getSetupHosts(ns).filter((h) => ns.getServerMaxRam(h) > 7)

  switch (command) {
    case "start":
      await setup(ns, usableHosts)
      start(ns, usableHosts)
      break
    case "stop":
      stop(ns, usableHosts)
      break
    case "help":
      ns.tprint("start|stop")
  }
}
