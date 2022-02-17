import { NS } from "@ns"
import { Job } from "/daemon"
import renderTable, { RawTableData } from "/lib/render-table"

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  while (true) {
    ns.clearLog()

    if (!ns.fileExists("jobs.json.txt")) {
      await ns.asleep(1000)
      continue
    }

    const data = JSON.parse(ns.read("jobs.json.txt")) as {
      preppedTargets: number
      prepLoad: number
      load: number
      jobs: Array<Job>
    }

    const table: RawTableData = [["Target", "Job Type", "Total Commands", "Done", "Current", "Threads", "RAM", "Time"]]
    for (const entry of data.jobs) {
      table.push([
        entry.target.hostname,
        entry.type,
        entry.commands.length,
        entry.jobsDone,
        entry.current?.script.file ?? "",
        entry.current?.threads ?? 0,
        Math.round(entry.current?.ram ?? 0),
        Math.round((entry.current?.time ?? 0) / 1000),
      ])
    }

    table.push([
      "Total Jobs: " + data.jobs.length,
      "Prep Load: " + Math.round(data.prepLoad * 100),
      "Load: " + Math.round(data.load * 100),
      "Prepped: " + data.preppedTargets,
    ])

    ns.print(renderTable(ns, table, true, true))
    await ns.asleep(1000)
  }
}
