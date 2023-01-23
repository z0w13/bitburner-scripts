import type { NS, Player, Server } from "@ns"
import { getBatch } from "/Command/Formulas"
import { BATCH_INTERVAL } from "/config"
import VirtualNetworkState from "/lib/VirtualNetworkState"
import { BatchJob, CommandForBatch } from "/JobScheduler/JobObjects"
import ServerWrapper from "/lib/ServerWrapper"

export function getBatchJob(ns: NS, target: Server, player: Player, network: VirtualNetworkState): BatchJob {
  const batchLimit = Math.min(100, Math.floor(getBatch(ns, target, player).time / BATCH_INTERVAL))
  const commands = []

  for (let batchNum = 0; batchNum < batchLimit; batchNum++) {
    const batch = getBatch(ns, target, player)
    const batchCommands: Array<CommandForBatch> = []
    try {
      for (const cmd of batch.commands) {
        const allocateResult = network.allocateScript(cmd.script, cmd.threads)

        cmd.host = allocateResult[1]
        network = allocateResult[0]

        batchCommands.push({
          cmd,
          batchId: batchNum,
          commandDelay: cmd.delay,
          batchDelay: BATCH_INTERVAL * batchNum, // Delay in milliseconds
          relativeEnd: cmd.delay + BATCH_INTERVAL * batchNum + cmd.time,
        })
      }
    } catch (e) {
      //ns.tprintf("ERROR: %s", e)
      break
    }

    commands.push(...batchCommands)
  }

  const serverWrapper = ServerWrapper.fromServer(ns, target)
  return new BatchJob(serverWrapper, Date.now(), commands)
}
