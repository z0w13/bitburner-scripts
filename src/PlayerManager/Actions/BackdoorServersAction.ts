import type { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
import getHostPath from "/lib/func/get-host-path"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class AcceptFactionInvitationsAction extends BaseAction {
  TARGET_SERVERS = ["CSEC", "I.I.I.I", "avmnite-02h", "run4theh111z"]

  getBackdoorableServers(ns: NS): Array<string> {
    const player = ns.getPlayer()

    return this.TARGET_SERVERS.filter((s) => !ns.getServer(s).backdoorInstalled)
      .filter((s) => ns.getServerRequiredHackingLevel(s) < player.skills.hacking)
      .filter((s) => ns.getServerNumPortsRequired(s) <= ns.getServer(s).openPortCount)
  }

  shouldPerform(ns: NS): boolean {
    return this.getBackdoorableServers(ns).length > 0
  }

  async perform(ns: NS): Promise<boolean> {
    const backdoorable = this.getBackdoorableServers(ns)
    const player = ns.getPlayer()

    for (const server of backdoorable) {
      const hackLevel = ns.getServerRequiredHackingLevel(server)
      if (player.skills.hacking < hackLevel) {
        continue
      }

      if (ns.getServerNumPortsRequired(server) < ns.getServer(server).openPortCount) {
        continue
      }

      const path = getHostPath(ns, server)
      if (!path) {
        continue
      }

      if (!path.every((h) => ns.singularity.connect(h))) {
        continue
      }

      await ns.singularity.installBackdoor()

      ns.singularity.connect(DAEMON_SERVER)
    }

    return true
  }

  isBackground(): boolean {
    return true
  }
}
