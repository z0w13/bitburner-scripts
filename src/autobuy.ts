import { NS } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"
import ServerBuyer from "/lib/buy-servers"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.disableLog("ALL")

  const flags = ns.flags([
    ["nextstep", false], // Only go to the next power of 2 up until everything's upgraded
    ["interval", 1000], // How long to sleep inbetween buy actions
    ["min-ram", 8], // Lowest ram servers to buy
  ])

  const serverBuyer = new ServerBuyer(ns, flags["min-ram"])
  while (true) {
    while (await serverBuyer.buy(flags["nextstep"])) {
      // Nothing, just buy until we fail
    }
    await ns.asleep(flags["interval"])
  }
}
