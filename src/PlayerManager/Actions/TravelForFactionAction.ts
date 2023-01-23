import { CityName } from "/data/StaticDefs"
import type { NS } from "@ns"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class AcceptFactionInvitationsAction extends BaseAction {
  TIAN_DI_HUI_CITIES: Array<CityName> = [CityName.NewTokyo, CityName.Chongqing, CityName.Ishima]

  shouldPerform(ns: NS): boolean {
    const player = ns.getPlayer()
    return (
      !player.factions.includes("Tian Di Hui") &&
      !this.TIAN_DI_HUI_CITIES.includes(player.city) &&
      player.money > 200_000
    )
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    return ns.singularity.travelToCity(CityName.NewTokyo)
  }

  isBackground(): boolean {
    return true
  }
}
