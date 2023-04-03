import type { NS } from "@ns"
import { SCRIPT_HACK } from "@/constants"
import renderTable from "@/lib/func/render-table"
import getThreadsAvailable from "@/lib/func/get-threads-available"
import Script from "@/lib/Script"
import { formatMoney, formatTime } from "@/lib/util"
import getTargets from "@/lib/func/get-targets"
import parseFlags from "@/lib/parseFlags"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = parseFlags(ns, { all: false })
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
      ns.formatNumber(server.growth, 0),
      ns.formatNumber(server.hackSkill, 0),
      formatTime(server.weakenTime),
      ns.formatNumber(server.initialWeakenThreads, 0),
      formatTime(server.hackTime),
      ns.formatNumber(server.hackThreads, 0),
      formatTime(server.growTime),
      ns.formatNumber(server.initialGrowThreads, 0),
      formatTime(server.growTime),
      ns.formatNumber(server.growThreads, 0),
      ns.formatNumber(server.score),
      formatMoney(ns, server.profitPerSecond, 0),
      formatTime(server.batchDuration),
      ns.formatNumber(server.batches),
      formatMoney(ns, server.batchProfitPerSecond, 0),
      ns.formatNumber(server.expPerSecond) + "xp",
      server.optimalType,
      formatMoney(ns, server.optimalProfit, 0),
    ]

    if (flags.all) {
      row.push(server.recommended ? "Y" : "")
    }

    table.push(row)
  }

  ns.tprint("\n" + renderTable(table))
  ns.tprint(`Current Threads Available: ${getThreadsAvailable(ns, Script.fromFile(ns, SCRIPT_HACK))}`)
}
