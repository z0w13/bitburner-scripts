import { NS } from "@ns"
import { COPY_SCRIPTS } from "/constants"

export default function isHostSetup(ns: NS, hostname: string): boolean {
  const haveRoot = ns.hasRootAccess(hostname)
  const scriptsInstalled = COPY_SCRIPTS.map((s) => ns.fileExists(s, hostname)).reduce(
    (acc, val) => (acc = !acc ? acc : val),
    true,
  )

  return haveRoot && scriptsInstalled
}
