import { NS } from "@ns"

export function getMoneyToReserve(ns: NS): number {
  if (!ns.fileExists("BruteSSH.exe")) {
    return 500_000
  }

  if (!ns.fileExists("AutoLink.exe")) {
    return 1_000_000
  }

  if (!ns.fileExists("FTPCrack.exe")) {
    return 1_500_000
  }

  //if (!ns.fileExists("relaySMTP.exe")) {
  //  return 5_000_000
  //}

  //if (!ns.fileExists("DeepscanV2.exe")) {
  //  return 25_000_000
  //}

  //if (!ns.fileExists("HTTPWorm.exe")) {
  //  return 30_000_000
  //}

  //if (!ns.fileExists("SQLInject.exe")) {
  //  return 250_000_000
  //}

  return Math.max(500_000, ns.getPlayer().money / 2)
}
