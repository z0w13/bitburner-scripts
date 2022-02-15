import { NS } from '@ns'

/**
 * @returns boolean Whether we got admin access on the server
 */
export default function hackHost(ns: NS, target: string): boolean {
  const server = ns.getServer(target);
  const player = ns.getPlayer();

  if (server.purchasedByPlayer) {
    return true;
  }

  if (!server.hasAdminRights) {
    if (player.hacking < server.requiredHackingSkill) {
      return false
    }

    switch (server.numOpenPortsRequired) {
      case 5:
        if (ns.fileExists("SQLInject.exe") && !server.sqlPortOpen) {
          ns.sqlinject(target);
        }
      // falls through
      case 4:
        if (ns.fileExists("HTTPWorm.exe") && !server.httpPortOpen) {
          ns.httpworm(target);
        }
      // falls through
      case 3:
        if (ns.fileExists("relaySMTP.exe") && !server.smtpPortOpen) {
          ns.relaysmtp(target);
        }
      // falls through
      case 2:
        if (ns.fileExists("FTPCrack.exe") && !server.ftpPortOpen) {
          ns.ftpcrack(target);
        }
      // falls through
      case 1:
        if (ns.fileExists("BruteSSH.exe") && !server.sshPortOpen) {
          ns.brutessh(target);
        }
        break;
    }

    if (server.numOpenPortsRequired > ns.getServer(server.hostname).openPortCount) {
      return false
    }

    ns.nuke(server.hostname);
  }

  return true
}