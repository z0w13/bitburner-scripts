import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import getHostPath from "/lib/func/get-host-path"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class AcceptFactionInvitationsAction extends BaseAction {
  TARGET_SERVERS = ["CSEC", "I.I.I.I", "avmnite-02h", "run4theh111z"]

  getBackdoorableServers(ns: NS): Array<string> {
    const player = ns.getPlayer()

    return this.TARGET_SERVERS.filter((s) => !ns.getServer(s).backdoorInstalled)
      .filter((s) => ns.getServerRequiredHackingLevel(s) < player.hacking)
      .filter((s) => ns.getServerNumPortsRequired(s) <= ns.getServer(s).openPortCount)
  }

  shouldPerform(ns: NS): boolean {
    return this.getBackdoorableServers(ns).length > 0
  }

  isPerforming(_ns: NS): boolean {
    return false
  }

  async perform(ns: NS): Promise<boolean> {
    const backdoorable = this.getBackdoorableServers(ns)
    const player = ns.getPlayer()

    for (const server of backdoorable) {
      const hackLevel = ns.getServerRequiredHackingLevel(server)
      if (player.hacking < hackLevel) {
        continue
      }

      if (ns.getServerNumPortsRequired(server) < ns.getServer(server).openPortCount) {
        continue
      }

      const path = getHostPath(ns, server)
      ns.print(server, " path ", path)
      if (!path) {
        continue
      }

      if (!path.every((h) => ns.connect(h))) {
        continue
      }

      await ns.installBackdoor()

      ns.connect(DAEMON_SERVER)
    }

    return true
  }

  isBackground(): boolean {
    return false
  }
}
