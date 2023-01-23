import { NS } from "@ns"
import { LOG_LEVEL } from "/config"
import getPlayerAction from "/lib/func/get-player-action"
import { FlagSchema, LogLevel } from "/lib/objects"
import { PlayerManager } from "/PlayerManager/PlayerManager"
import parseFlags from "/lib/parseFlags"

const flagSchema: FlagSchema = [["logLevel", LOG_LEVEL]]

interface Flags {
  logLevel: LogLevel
}

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags<Flags>(ns, flagSchema)

  ns.disableLog("ALL")

  const playerMgr = new PlayerManager(ns, flags.logLevel)

  while (true) {
    await ns.asleep(2000)
    await playerMgr.run(ns)

    if (flags.logLevel >= LogLevel.Debug) {
      ns.print(getPlayerAction(ns))
    }
  }
}
