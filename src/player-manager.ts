import { NS } from "@ns"
import { LOG_LEVEL } from "/config"
import getPlayerAction from "/lib/func/get-player-action"
import { LogLevel } from "/lib/objects"
import { PlayerManager } from "/PlayerManager/PlayerManager"
import parseFlags from "/lib/parseFlags"

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags(ns, { logLevel: LOG_LEVEL })

  const playerMgr = new PlayerManager(ns, flags.logLevel)

  while (true) {
    await ns.asleep(2000)
    await playerMgr.run(ns)

    if (flags.logLevel >= LogLevel.Debug) {
      ns.print(getPlayerAction(ns))
    }
  }
}
