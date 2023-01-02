import { NS } from "@ns"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"
import { getBatchJob } from "/lib/func/get-batch-job"
import renderTable from "/lib/func/render-table"
import runCommand from "/lib/func/run-command"
import waitForPids from "/lib/func/wait-for-pids"
import HostManager from "/lib/HostManager"
import { maxMoney, minSecurity } from "/lib/HwgwShared"
import { FlagSchema } from "/lib/objects"
import { formatDate, formatMoney, formatNum, formatTime, renderProgress } from "/lib/util"
import VirtualNetworkState from "/lib/VirtualNetworkState"

const flagSchema: FlagSchema = [["target", "n00dles"]]

interface Flags {
  target: string
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  ns.enableLog("exec")

  const flags = ns.flags(flagSchema) as Flags & ScriptArgs

  while (true) {
    const hostMgr = new HostManager(ns)
    const usableServers = hostMgr.getUsableServers()
    const network = VirtualNetworkState.fromServersWithoutCommands(ns, usableServers)
    const server = ns.getServer(flags.target)
    const player = ns.getPlayer()
    const job = getBatchJob(ns, server, player, network.copy())

    await maxMoney(ns, flags.target)
    await minSecurity(ns, flags.target)

    ns.print(`created ${job.numBatches} batches for "${flags.target}"`)
    if (job.numBatches === 0) {
      return
    }

    const pids: Array<number> = []

    const startTime = Date.now()
    const commandQueue = [...job.commands].reverse()
    while (commandQueue.length > 0) {
      for (let i = 0; i < 20; i++) {
        const command = commandQueue.pop()
        if (!command) {
          break
        }

        delete command.cmd.script.flags["delay"]

        command.cmd.script.flags["endTime"] = Math.round(startTime + command.relativeEnd)
        command.cmd.script.flags["commandTime"] = Math.round(command.cmd.time)

        //ns.printf(
        //  "%30s %20s %20s",
        //  command.cmd.script.file,
        //  formatTime(command.cmd.delay + command.cmd.time, true),
        //  formatDate(ns, new Date(command.cmd.script.flags.endTime)),
        //)

        pids.push(...runCommand(ns, command.cmd))
      }
      await ns.asleep(25)
    }

    const endDate = new Date(startTime + Math.max(...job.commands.map((c) => c.relativeEnd)))
    ns.print(`Running ${job.numBatches} done at ${formatDate(ns, endDate, false)}`)
    await waitForPids(ns, pids, 1000, (rem) => {
      ns.clearLog()

      const server = ns.getServer(flags.target)
      const table = [
        ["Target", flags.target],
        ["Done At", formatDate(ns, endDate, false)],
        ["Duration", formatTime(endDate.getTime() - startTime)],
        ["Remaining", formatTime(endDate.getTime() - Date.now())],
        ["", renderProgress({ value: Date.now(), min: startTime, max: endDate.getTime(), width: 20 })],
        ["Batches", job.numBatches],
        ["Processes", formatNum(ns, rem, "0,0")],
        [
          "Sec (Min/Base/Curr)",
          ns.sprintf("%s/%s/%s", server.minDifficulty, server.baseDifficulty, formatNum(ns, server.hackDifficulty)),
        ],
        [
          "Money (Curr/Max/%)",
          ns.sprintf(
            "%s/%s/%s%%",
            formatMoney(ns, server.moneyAvailable),
            formatMoney(ns, server.moneyMax),
            formatNum(ns, (server.moneyAvailable / server.moneyMax) * 100),
          ),
        ],
      ]
      ns.print(renderTable(ns, table, false))
    })
  }
}
