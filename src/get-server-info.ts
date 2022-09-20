import { NS } from "@ns"
import { FlagSchema } from "/lib/objects"
import renderTable from "/lib/func/render-table"
import ServerWrapper from "/lib/ServerWrapper"
import { DAEMON_SERVER } from "/config"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"

const flagSchema: FlagSchema = [["hostname", DAEMON_SERVER]]

interface Flags {
  hostname: string
}

export async function main(ns: NS): Promise<void> {
  const flags = ns.flags(flagSchema) as Flags & ScriptArgs

  const snapshot = new ServerWrapper(ns, flags.hostname).getSnapshot()

  ns.tprint("\n" + renderTable(ns, Object.entries(snapshot), false))
}
