import { NS } from "@ns"
import { SCRIPT_HACK } from "/constants"
import renderTable from "/lib/func/render-table"
import getThreadsAvailable from "/lib/func/get-threads-available"
import { FlagSchema } from "/lib/objects"
import { formatMoney, formatNum, formatTime } from "/lib/util"
import getTargets from "/lib/func/get-targets"

const flagSchema: FlagSchema = [["all", false]]

interface Flags {
  all: boolean
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags

  const servers = getTargets(ns, flags.all)

  const table: Array<Array<unknown>> = [
    [
      "Name",
      "Sec Min/Base/Curr",
      "Money Curr/Max (%)",
      "Grow",
      "Skill",
      "I. Weak S",
      "Thr",
      "Hack S",
      "I. Grow S",
      "Threads",
      "Grow Thr",
      "Prep Ratio",
      "$/s",
      "XP/thr",
    ],
  ]

  for (const server of servers) {
    const row = [
      server.name,
      ns.sprintf("%.2f/%.2f/%.2f", server.minDiff, server.baseDiff, server.currDiff),
      ns.sprintf(
        "%s/%s (%.2f%%)",
        formatMoney(ns, server.currMoney),
        formatMoney(ns, server.maxMoney),
        server.pctMoney * 100,
      ),
      formatNum(ns, server.growth),
      server.hackSkill,
      formatTime(server.weakenTime),
      formatNum(ns, server.initialWeakenThreads, "0,0"),
      formatTime(server.hackTime),
      formatTime(server.growTime),
      formatNum(ns, server.initialGrowThreads, "0,0"),
      formatNum(ns, server.growThreads, "0,0"),
      formatNum(ns, server.score),
      formatMoney(ns, server.profitPerSecond, "$0,0"),
      formatNum(ns, server.expPerSecond) + "xp",
    ]

    if (flags.all) {
      row.push(server.recommended ? "Y" : "")
    }

    table.push(row)
  }

  ns.tprint(renderTable(ns, table))
  ns.tprint(
    `Current Threads Available: ${getThreadsAvailable(ns, { file: SCRIPT_HACK, ram: ns.getScriptRam(SCRIPT_HACK) })}`,
  )
}
