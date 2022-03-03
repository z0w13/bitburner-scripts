import { NS } from "@ns"
import { CRIMES, STATIC_DATA } from "/constants"
import { getBitNodeMultipliers } from "/lib/func/get-bitnode-multipliers"
import { StaticData } from "/lib/objects"

export async function main(ns: NS): Promise<void> {
  const player = ns.getPlayer()
  const staticData: StaticData = {
    crimes: CRIMES.map((name) => ns.getCrimeStats(name)),
    bitnode_mult: getBitNodeMultipliers(ns),
    player_mult: {
      hacking_money: player.hacking_money_mult,
      hacking_speed: player.hacking_speed_mult,
      hacking_grow: player.hacking_grow_mult,
    },
  }

  await ns.write(STATIC_DATA, JSON.stringify(staticData), "w")
}
