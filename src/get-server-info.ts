import type { NS } from "@ns"
import renderTable from "/lib/func/render-table"
import ServerWrapper from "/lib/ServerWrapper"
import { DAEMON_SERVER } from "/config"
import parseFlags from "/lib/parseFlags"

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags(ns, { hostname: DAEMON_SERVER })

  const snapshot = new ServerWrapper(ns, flags.hostname).getSnapshot()

  ns.tprint("\n" + renderTable(ns, Object.entries(snapshot), false))
}
