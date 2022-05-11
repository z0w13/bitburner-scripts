import { NS } from "@ns"
import getSetupHosts from "/lib/func/get-setup-hosts"
import renderTable from "/lib/func/render-table"
import { formatGiB, SEGMENT_FULL } from "/lib/util"
import { renderProgress } from "/lib/util"

function printStatus(ns: NS): void {
  const hosts = getSetupHosts(ns)
  hosts.sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b))

  const table = [["Host", "Threads", "RAM"]]

  let totalThreads = 0
  let totalRam = 0
  let totalRamUsed = 0

  for (const host of hosts) {
    const processes = ns.ps(host)
    const server = ns.getServer(host)

    if (server.maxRam === 0) {
      continue
    }

    let hostThreads = 0
    for (const process of processes) {
      hostThreads += process.threads
    }

    totalThreads += hostThreads
    totalRam += server.maxRam
    totalRamUsed += server.ramUsed

    if (processes.length === 0) {
      continue
    }

    table.push([
      host,
      hostThreads.toString(),
      ns.vsprintf("%7s/%7s (%3d%%) [%s]", [
        formatGiB(ns, server.ramUsed),
        formatGiB(ns, server.maxRam),
        (server.ramUsed / server.maxRam) * 100,
        renderProgress({ value: server.ramUsed, max: server.maxRam, width: 20, segmentSymbols: SEGMENT_FULL }),
      ]),
    ])
  }

  table.push([
    "Total (" + hosts.length + ")",
    totalThreads.toString(),
    ns.vsprintf("%7s/%7s (%3d%%) [%s]", [
      formatGiB(ns, totalRamUsed),
      formatGiB(ns, totalRam),
      (totalRamUsed / totalRam) * 100,
      renderProgress({ value: totalRamUsed, max: totalRam, width: 20, segmentSymbols: SEGMENT_FULL }),
    ]),
  ])

  ns.print(renderTable(ns, table, true, true))
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  while (true) {
    ns.clearLog()
    printStatus(ns)
    await ns.asleep(1000)
  }
}
