import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"

export async function main(ns: NS): Promise<void> {
  for (const file of ns.ls(DAEMON_SERVER, ".js")) {
    ns.rm(file)
  }
}
