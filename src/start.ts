import { NS } from "@ns"
import getSetupHosts from "/lib/get-setup-hosts"
import waitForPids from "/lib/wait-for-pids"
import { SCRIPT_SERVER_STATUS, SCRIPT_WGWH_LOOP, SCRIPT_WGWH_STATUS } from "/constants"

const IGNORE_HOSTS = [
  "fulcrumassets", // High XP, no money, don't run scan and run hack on this
]

export async function main(ns: NS): Promise<void> {
  const player = ns.getPlayer()
  ns.disableLog("scan")
  const pids = []

  const sarhStatusPid = ns.exec(SCRIPT_WGWH_STATUS, "home")
  ns.tail(sarhStatusPid)
  pids.push(sarhStatusPid)

  const serverStatusPid = ns.exec(SCRIPT_SERVER_STATUS, "home")
  ns.tail(serverStatusPid)
  pids.push(serverStatusPid)

  const autosetupPid = ns.exec("autosetup.js", "home")
  ns.tail(autosetupPid)
  pids.push(autosetupPid)

  const autobuyPid = ns.exec("autobuy.js", "home")
  ns.tail(autobuyPid)
  pids.push(autobuyPid)

  const runningHosts = []
  const pid = ns.exec(SCRIPT_WGWH_LOOP, "home", 1, "--target", "n00dles")
  runningHosts.push("n00dles")
  pids.push(pid)

  while (true) {
    const hosts = getSetupHosts(ns)
    for (const host of hosts) {
      if (IGNORE_HOSTS.indexOf(host) > -1) {
        continue
      }

      if (runningHosts.indexOf(host) > -1) {
        continue
      }

      const server = ns.getServer(host)
      if (server.moneyMax < 1_500_000) {
        continue
      }

      if (player.hacking < 1000 && ns.getWeakenTime(host) > 5 * 60 * 1000) {
        continue
      }

      const pid = ns.exec(SCRIPT_WGWH_LOOP, "home", 1, "--target", host)
      runningHosts.push(host)
      pids.push(pid)
    }

    await ns.asleep(10000)

    //if (ns.fileExists("Formulas.exe", "home")) {
    //  ns.tprint("Early game done, woo")
    //  break
    //}
  }

  for (const pid of pids) {
    await ns.kill(pid)
  }

  await waitForPids(ns, pids)
}
