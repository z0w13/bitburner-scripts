import { NS, Player, Server } from "@ns"
import { SERVER_WEAKEN_AMOUNT } from "/constants"

export function getGrowThreads(ns: NS, server: Server, player: Player): number {
  // Seems linear so we can just divide after subtracting the 1(00%)
  // https://github.com/danielyxie/bitburner/blob/6c3ad48ef518dc9b72d9f0f6fde5c9b04deab0c1/src/Server/formulas/grow.ts#L6
  const growPercent = ns.formulas.hacking.growPercent(server, 1, player)
  const growAmount = server.moneyMax / server.moneyAvailable

  return Math.ceil(Math.log(growAmount) / Math.log(growPercent))
}

export function getHackThreads(ns: NS, server: Server, player: Player, pctToHack: number): number {
  return Math.floor(
    (server.moneyAvailable * pctToHack) / (server.moneyAvailable * ns.formulas.hacking.hackPercent(server, player)),
  )
}

export function getWeakenThreads(server: Server, additionalSec = 0): number {
  return Math.ceil((server.hackDifficulty - server.minDifficulty + additionalSec) / SERVER_WEAKEN_AMOUNT)
}
