import { NS } from "@ns"
import { FlagSchema } from "/lib/objects"
import renderTable from "/lib/func/render-table"
import ServerWrapper from "/lib/server-wrapper"

const flagSchema: FlagSchema = [["hostname", "home"]]

interface Flags {
  hostname: string
}

export async function main(ns: NS): Promise<void> {
  const flags = ns.flags(flagSchema) as Flags

  const snapshot = new ServerWrapper(ns, flags.hostname).getSnapshot()

  ns.tprint("\n" + renderTable(ns, Object.entries(snapshot), false))
}
