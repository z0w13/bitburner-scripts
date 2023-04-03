import type { NS } from "@ns"
import BaseAction from "@/PlayerManager/Actions/BaseAction"

export default class AcceptFactionInvitationsAction extends BaseAction {
  shouldPerform(ns: NS): boolean {
    return ns.singularity.checkFactionInvitations().length > 0
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    return ns.singularity.checkFactionInvitations().every((f) => {
      const success = ns.singularity.joinFaction(f)

      if (success) {
        ns.toast(`Joined faction ${f}`)
      }

      return success
    })
  }

  isBackground(): boolean {
    return true
  }
}
