import { NS, Player, Server } from "@ns"
import { SERVER_WEAKEN_AMOUNT } from "/constants"

export function getGrowThreads(ns: NS, server: Server, player: Player): number {
  // Seems linear so we can just divide
  // https://github.com/danielyxie/bitburner/blob/6c3ad48ef518dc9b72d9f0f6fde5c9b04deab0c1/src/Server/formulas/grow.ts#L6
  const growPercent = ns.formulas.hacking.growPercent(server, 1, player)

  return Math.ceil((1 - server.moneyMax / server.moneyAvailable) / growPercent)
}

export function getHackThreads(ns: NS, server: Server, player: Player, pctToHack: number): number {
  return Math.floor(
    (server.moneyMax * pctToHack) / (server.moneyAvailable * ns.formulas.hacking.hackPercent(server, player)),
  )
}

export function getWeakenThreads(server: Server, additionalSec = 0): number {
  return Math.ceil((server.hackDifficulty - server.minDifficulty + additionalSec) / SERVER_WEAKEN_AMOUNT)
}
