import { NS } from "@ns"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class CreateCorpAction extends BaseAction {
  name: string

  constructor(name: string) {
    super()

    this.name = name
  }
  shouldPerform(ns: NS): boolean {
    const player = ns.getPlayer()
    return player.money > 25_000_000_000 && !player.hasCorporation
  }
  isPerforming(_ns: NS): boolean {
    return false
  }
  perform(ns: NS): boolean {
    if (!ns.corporation.createCorporation(this.name, true)) {
      return false
    }

    const pid = ns.exec("/corp-manager.js", "home", 1)
    if (pid > 0) {
      ns.tail(pid)
    }

    return true
  }
  getType(): ActionType {
    return ActionType.IDLE
  }
}