import { NS, Player, Server } from "@ns"
import { SERVER_WEAKEN_AMOUNT } from "/constants"

// NOTE(zowie): Neither this or ns.growthAnalyze seem to keep in mind that we also get MONEY*THREADS every growth cycle
//              might have to find a way to factor this in in either, or have an upper limit here, but not sure what that limit
//              should be
// https://github.com/danielyxie/bitburner/blob/c2c31eede6bbdb23be59f07784fe4bb40e805143/src/Server/ServerHelpers.ts#L78
// https://github.com/danielyxie/bitburner/blob/c2c31eede6bbdb23be59f07784fe4bb40e805143/src/Server/ServerHelpers.ts#L49
export function getGrowThreads(ns: NS, server: Server, player: Player): number {
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
