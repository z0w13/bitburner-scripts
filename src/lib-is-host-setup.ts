import { NS } from '@ns'

export default function isHostSetup(ns: NS, hostname: string): boolean {
  const haveRoot = ns.hasRootAccess(hostname);
  const scriptInstalled = ns.fileExists("cmd-hack.js", hostname);
  return haveRoot && scriptInstalled
}