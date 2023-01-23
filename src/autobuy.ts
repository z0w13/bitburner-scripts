import type { NS } from "@ns"
import parseFlags from "/lib/parseFlags"
import ServerBuyer from "/lib/ServerBuyer"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = parseFlags(ns, {
    nextstep: false, // Only go to the next power of 2 up until everything's upgraded
    interval: 1000, // How long to sleep inbetween buy actions
    "min-ram": 8, // Lowest ram servers to buy
  })

  const serverBuyer = new ServerBuyer(ns, flags["min-ram"])

  if (ns.getPurchasedServerLimit() === 0) {
    ns.print("Server limit 0, exiting.")
    ns.exit()
  }

  while (true) {
    while (await serverBuyer.buy(flags["nextstep"])) {
      // Nothing, just buy until we fail
    }
    await ns.asleep(flags["interval"])
  }
}
