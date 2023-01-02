import { NS, CrimeType } from "@ns"
import { STATIC_DATA } from "/constants"
import { getBitNodeMultipliers } from "/lib/func/get-bitnode-multipliers"
import { StaticData } from "/lib/objects"

export async function main(ns: NS): Promise<void> {
  const player = ns.getPlayer()
  const staticData: StaticData = {
    crimes: Object.values(CrimeType).map((name) => ns.singularity.getCrimeStats(name)),
    bitnode_mult: getBitNodeMultipliers(ns),
    player_mult: {
      hacking_money: player.mults.hacking_money || 1,
      hacking_speed: player.mults.hacking_speed || 1,
      hacking_grow: player.mults.hacking_grow || 1,
    },
  }

  ns.write(STATIC_DATA, JSON.stringify(staticData), "w")
}
