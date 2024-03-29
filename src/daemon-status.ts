import type { NS } from "@ns"
import { JobType, SerializedJob } from "@/JobScheduler/JobObjects"
import renderTable, { RawTableData } from "@/lib/func/render-table"
import ServerWrapper from "@/lib/ServerWrapper"
import { formatGiB, formatMoney, formatNum, formatTime, sum } from "@/lib/util"
import { SerializedDaemonStatus } from "@/lib/serialized"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  while (true) {
    ns.clearLog()

    if (!ns.fileExists("jobs.json.txt")) {
      await ns.asleep(1000)
      continue
    }

    const data = JSON.parse(ns.read("jobs.json.txt")) as SerializedDaemonStatus
    ns.print(renderStatusTable(ns, data))
    ns.print(
      renderJobTable(
        ns,
        data.jobs.filter((j) => j.type == JobType.HackWeakenGrowWeaken),
      ),
    )

    const prepJobs = data.jobs.filter((j) => j.type == JobType.Prep)
    if (prepJobs.length > 0) {
      ns.print("")
      ns.print(
        renderJobTable(
          ns,
          data.jobs.filter((j) => j.type == JobType.Prep),
        ),
      )
    }
    await ns.asleep(1000)
  }
}
function renderStatusTable(ns: NS, data: SerializedDaemonStatus) {
  const preppedByProfit = [...data.preppedTargets].sort((a, b) => b.profitPerSecond - a.profitPerSecond)
  const lastUpdate = new Date(data.lastUpdate)
  const updatedSecondsAgo = Math.round((Date.now() - data.lastUpdate) / 1000)

  const table: RawTableData = [
    ["Load", ns.formatPercent(data.load)],
    ["Prep Load", ns.formatPercent(data.prepLoad)],
    ["Profit/s", ns.formatNumber(data.profitPerSecond, 2)],
    ["Exp/s", ns.formatNumber(data.expPerSecond, 2)],
    ["Prepped", ns.formatNumber(data.preppedTargets.length, 0)],
    ["Stopping", data.stopping],
    [
      "Last Update",
      ns.sprintf("%02d:%02d:%02d", lastUpdate.getHours(), lastUpdate.getMinutes(), lastUpdate.getSeconds()),
    ],
    ["", ns.sprintf("(%ds ago)", updatedSecondsAgo)],
    [],
    ["Most Profitable", preppedByProfit[0]?.hostname ?? ""],
    [],
  ]

  preppedByProfit.slice(0, 3).forEach((val, idx) => {
    table.push([idx + ". " + val.hostname, formatMoney(ns, val.profitPerSecond)])
  })

  return renderTable(table, false)
}

function renderJobTable(ns: NS, jobs: Array<SerializedJob>) {
  const table: RawTableData = [
    ["Target", "Sec", "$ %", "Type", "P", "Cmds", "Current", "Thr", "RAM", "Time", "~Left", "$/s"],
  ]

  const sortedJobs = [...jobs].sort((a, b) => {
    const aTime = sum(a.commands.map((c) => c.time))
    const bTime = sum(b.commands.map((c) => c.time))

    return a.createdAt + aTime - (b.createdAt + bTime)
  })

  for (const entry of sortedJobs) {
    const totalTime = sum(entry.commands.map((c) => c.time))
    const timeRemaining = Math.max(0, totalTime - (Date.now() - entry.createdAt))

    table.push([
      entry.target,
      ns.sprintf("%5.2f/%5.2f", ns.getServerSecurityLevel(entry.target), ns.getServerMinSecurityLevel(entry.target)),
      ns.formatPercent(ns.getServerMoneyAvailable(entry.target) / ns.getServerMaxMoney(entry.target), 0),
      entry.type,
      entry.partial ? "Y" : "N",
      `${entry.commandsDone}/${entry.commands.length}`,
      entry.current?.script.file ?? "",
      formatNum(ns, entry.current?.threads ?? 0, 0, 1_000_000),
      formatGiB(ns, entry.current?.ram ?? 0, 0),
      formatTime(totalTime),
      formatTime(timeRemaining),
      formatMoney(ns, new ServerWrapper(ns, entry.target).getProfitPerSecond()) + "/s",
    ])
  }

  return renderTable(table)
}
