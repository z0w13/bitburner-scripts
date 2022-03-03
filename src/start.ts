import { NS } from "@ns"
import { isScriptRunning } from "/lib/func/is-script-running"
import waitForPids from "/lib/func/wait-for-pids"
import setupPolyfill from "/lib/ns-polyfill"
import getScriptPid from "/lib/func/get-script-pid"

const scriptsToRun = ["player-manager.js", "autosetup.js", "basic-hwgw.js", "autobuy.js"]

function getAvailRam(ns: NS): number {
  return ns.getServerMaxRam("home") - ns.getServerUsedRam("home")
}

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  await waitForPids(ns, [ns.exec("/libexec/static-data.js", "home", 1)])

  for (const script of scriptsToRun) {
    if (getAvailRam(ns) > ns.getScriptRam(script, "home")) {
      if (!isScriptRunning(ns, script, "home")) {
        ns.tail(ns.exec(script, "home", 1))
      } else {
        ns.tail(getScriptPid(ns, script, "home"))
      }
    }
  }
}
