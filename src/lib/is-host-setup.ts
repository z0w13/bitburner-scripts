import { NS } from "@ns"
import { SCRIPT_HACK } from "/constants"

export default function isHostSetup(ns: NS, hostname: string): boolean {
  const haveRoot = ns.hasRootAccess(hostname)
  const scriptInstalled = ns.fileExists(SCRIPT_HACK, hostname)
  return haveRoot && scriptInstalled
}
