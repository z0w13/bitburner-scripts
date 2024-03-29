import type { NS } from "@ns"
import { DAEMON_SERVER } from "@/config"
import BaseAction from "@/PlayerManager/Actions/BaseAction"

export default class CreateCorpAction extends BaseAction {
  name: string

  constructor(name: string) {
    super()

    this.name = name
  }
  shouldPerform(ns: NS): boolean {
    return ns.getPlayer().money > 25_000_000_000 && !ns.corporation.hasCorporation()
  }
  isPerforming(_ns: NS): boolean {
    return false
  }
  async perform(ns: NS): Promise<boolean> {
    if (!ns.corporation.createCorporation(this.name, true)) {
      return false
    }

    const pid = ns.exec("/corp-manager.js", DAEMON_SERVER, 1)
    if (pid > 0) {
      ns.tail(pid)
    }

    return true
  }
}
