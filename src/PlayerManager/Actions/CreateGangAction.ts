import { NS } from "@ns"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class CreateGangAction extends BaseAction {
  name: string

  constructor(name: string) {
    super()

    this.name = name
  }
  shouldPerform(ns: NS): boolean {
    return ns.getPlayer().numPeopleKilled * 3 >= 54000 && !ns.gang.inGang()
  }
  isPerforming(_ns: NS): boolean {
    return false
  }
  async perform(ns: NS): Promise<boolean> {
    if (!ns.gang.createGang(this.name)) {
      return false
    }

    const pid = ns.exec("/gang-train.js", "home", 1)
    if (pid > 0) {
      ns.tail(pid)
    }

    return true
  }
}
