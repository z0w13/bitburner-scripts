import { NS } from "@ns"
import { SCRIPT_HACK } from "/constants"
import renderTable from "/lib/func/render-table"
import getThreadsAvailable from "/lib/func/get-threads-available"
import { FlagSchema } from "/lib/objects"
import Script from "/lib/Script"
import { formatMoney, formatNum, formatTime } from "/lib/util"
import getTargets from "/lib/func/get-targets"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"

const flagSchema: FlagSchema = [["all", false]]

interface Flags {
  all: boolean
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags & ScriptArgs

  const servers = getTargets(ns, flags.all)

  const table: Array<Array<unknown>> = [
    [
      "Name",
      "Sec Min/Bas/Cur",
      "Money Curr/Max (%)",
      "Grow",
      "Skill",
      "I. Weak",
      "Thr",
      "Hack",
      "Thr",
      "I. Grow",
      "Thr",
      "Grow",
      "Thr",
      "Prep Ratio",
      "$/s",
      "Batch S",
      "#",
      "$/s",
      "XP/thr",
      "Optim",
      "Optim $/s",
    ],
  ]

  for (const server of servers) {
    const row = [
      server.name,
      ns.sprintf("%3.0f/%3.0f/%5.2f", server.minDiff, server.baseDiff, server.currDiff),
      ns.sprintf(
        "%s/%s (%3d%%)",
        formatMoney(ns, server.currMoney),
        formatMoney(ns, server.maxMoney),
        server.pctMoney * 100,
      ),
      formatNum(ns, server.growth, "0,0"),
      formatNum(ns, server.hackSkill, "0,0"),
      formatTime(server.weakenTime),
      formatNum(ns, server.initialWeakenThreads, "0,0"),
      formatTime(server.hackTime),
      formatNum(ns, server.hackThreads, "0,0"),
      formatTime(server.growTime),
      formatNum(ns, server.initialGrowThreads, "0,0"),
      formatTime(server.growTime),
      formatNum(ns, server.growThreads, "0,0"),
      formatNum(ns, server.score),
      formatMoney(ns, server.profitPerSecond, "$0,0"),
      formatTime(server.batchDuration),
      formatNum(ns, server.batches, "0,0"),
      formatMoney(ns, server.batchProfitPerSecond, "$0,0"),
      formatNum(ns, server.expPerSecond) + "xp",
      server.optimalType,
      formatMoney(ns, server.optimalProfit, "$0,0"),
    ]

    if (flags.all) {
      row.push(server.recommended ? "Y" : "")
    }

    table.push(row)
  }

  ns.tprint("\n" + renderTable(ns, table))
  ns.tprint(`Current Threads Available: ${getThreadsAvailable(ns, Script.fromFile(ns, SCRIPT_HACK))}`)
}
