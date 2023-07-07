import getHostPath from "@/lib/func/get-host-path"
import hackHost from "@/lib/func/hack-host"
import { NS } from "@ns"

const WORLD_DAEMON = "w0r1d_d43m0n"

export async function main(ns: NS): Promise<void> {
  const minLevel = ns.getServerRequiredHackingLevel(WORLD_DAEMON)
  const playerLevel = ns.getPlayer().skills.hacking

  if (minLevel > playerLevel) {
    ns.tprint(`ERROR: Need hacking level of ${minLevel} have ${playerLevel}`)
    return
  }

  if (!hackHost(ns, WORLD_DAEMON)) {
    ns.tprint("ERROR: Failed to hack world daemon")
    return
  }

  const path = getHostPath(ns, WORLD_DAEMON)
  if (!path) {
    ns.tprint("ERROR: Couldn't find path to world daemon")
    return
  }

  path.forEach((host) => {
    ns.singularity.connect(host)
  })
  await ns.singularity.installBackdoor()
}
