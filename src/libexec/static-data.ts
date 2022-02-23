import { NS } from "@ns"
import { getBitNodeMultipliers } from "/lib/func/get-bitnode-multipliers"
import { StaticData } from "/lib/objects"

export async function main(ns: NS): Promise<void> {
  const player = ns.getPlayer()
  const staticData: StaticData = {
    bitnode_mult: getBitNodeMultipliers(ns),
    player_mult: {
      hacking_money: player.hacking_money_mult,
      hacking_speed: player.hacking_speed_mult,
      hacking_grow: player.hacking_grow_mult,
    },
  }

  await ns.write("/data/static.txt", JSON.stringify(staticData), "w")
}
