import { NS } from "@ns"
import { SCRIPT_HACK } from "/constants"
import renderTable from "/lib/render-table"
import getHosts from "/lib/get-hosts"
import ServerWrapper from "/lib/server-wrapper"
import getThreadsAvailable from "/lib/get-threads-available"
import { FlagSchema } from "/lib/objects"

const flagSchema: FlagSchema = [["all", false]]

interface Flags {
  all: boolean
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags

  const servers = getHosts(ns)
    .map((h) => new ServerWrapper(ns, h))
    .filter((s) => s.isRecommendedTarget().recommended || (flags.all && s.moneyMax > 0))
    .sort((a, b) => a.getProfitPerSecond() - b.getProfitPerSecond())

  const table: Array<Array<unknown>> = [
    [
      "Name",
      "Min Sec",
      "Base Sec",
      "Sec",
      "Curr $",
      "Max $",
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
    ],
  ]

  for (const server of servers) {
    const row = [
      server.hostname,
      server.minDifficulty,
      server.baseDifficulty,
      Math.round(server.getHackDifficulty()),
      Math.round(server.getMoneyAvailable()),
      server.moneyMax,
      server.serverGrowth,
      server.requiredHackingSkill,
      Math.round(server.getWeakenTime() / 1000),
      ns.nFormat(server.getInitialWeakenThreads(), "0,0"),
      Math.round(server.getHackTime() / 1000),
      Math.round(server.getGrowTime() / 1000),
      ns.nFormat(server.getInitialGrowThreads(), "0,0"),
      ns.nFormat(server.getGrowThreads(), "0,0"),
      ns.nFormat((server.getWeakenTime() / server.getProfitPerSecond()) * 1000, ".0000"),
      ns.nFormat(server.getProfitPerSecond(), "$0,0"),
    ]

    if (flags.all) {
      row.push(server.isRecommendedTarget().recommended ? "Y" : "")
    }

    table.push(row)
  }

  ns.print(renderTable(ns, table))
  ns.print(
    `Current Threads Available: ${getThreadsAvailable(ns, { file: SCRIPT_HACK, ram: ns.getScriptRam(SCRIPT_HACK) })}`,
  )
}
