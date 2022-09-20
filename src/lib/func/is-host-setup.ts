import { NS } from "@ns"
import { COPY_SCRIPTS } from "/constants"

export default function isHostSetup(ns: NS, hostname: string): boolean {
  const hasRoot = ns.getServer(hostname).hasAdminRights
  return hasRoot && COPY_SCRIPTS.map((s) => ns.fileExists(s, hostname)).indexOf(false) === -1
}
