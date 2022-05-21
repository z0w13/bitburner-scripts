import { NS } from "@ns"
import { LocationName } from "/data/LocationNames"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class AcceptFactionInvitationsAction extends BaseAction {
  TIAN_DI_HUI_CITIES: Array<string> = [LocationName.NewTokyo, LocationName.Chongqing, LocationName.Ishima]

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
    return ns.singularity.travelToCity(LocationName.NewTokyo)
  }

  isBackground(): boolean {
    return true
  }
}
