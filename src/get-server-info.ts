import { NS } from "@ns"
import { FlagSchema } from "/lib/objects"
import renderTable from "/lib/func/render-table"
import ServerWrapper from "/lib/ServerWrapper"
import { DAEMON_SERVER } from "/config"
import parseFlags from "/lib/parseFlags"

const flagSchema: FlagSchema = [["hostname", DAEMON_SERVER]]

interface Flags {
  hostname: string
}

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags<Flags>(ns, flagSchema)

  const snapshot = new ServerWrapper(ns, flags.hostname).getSnapshot()

  ns.tprint("\n" + renderTable(ns, Object.entries(snapshot), false))
}
