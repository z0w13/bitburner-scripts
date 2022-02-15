import { NS } from "@ns";
import renderTable from "/lib/render-table";

interface Flags {
  interval: number
}

interface ProcData {
  target: string
  money: number
  exp: number
  batch: Record<string, unknown>
}

async function printStatus(ns: NS) {
  const procs = ns.ps("home");
  const procData: Array<ProcData> = [];
  for (const proc of procs) {
    if (proc.filename !== "cnc.js") {
      continue;
    }

    const procFlags: Record<string, string> = {}
    try {
      for (let i=0; i<proc.args.length-1; i+=2) {
        procFlags[proc.args[i].substring(2)] = proc.args[i+1];
      }

      let batch = {}
      try {
        batch = JSON.parse(ns.getScriptLogs(proc.filename, "home", ...proc.args).at(-1) ?? "{}")
      } catch(e) {
        batch = {}
      }

      procData.push({
        target: 
        procFlags["target"], 
        money: ns.getScriptIncome(proc.filename, "home", ...proc.args),
        exp: ns.getScriptExpGain(proc.filename, "home", ...proc.args),
        batch,
      });
    } catch (e) {
      //
    }
  }

  const table: Array<Array<unknown>> = [
    ["Target", "Exp/s", "Money/s", "Money (%)", "Security", "Batches", "Active", "Success", "Failure", "% Success", "ID"]
  ];

  for (const data of procData) {
    const server = ns.getServer(data.target);

    table.push([
        data.target,
        ns.sprintf("%7.2f", data.exp),
        ns.nFormat(data.money, "$0.00a"),
        ns.sprintf("%s (%5.2f%%)", ns.nFormat(server.moneyAvailable, "$0.00a"), (server.moneyAvailable / server.moneyMax) * 100),
        ns.sprintf("%5.2f/%5.2f", server.hackDifficulty, server.minDifficulty),
        data.batch?.total ?? 0,
        data.batch?.active ?? 0,
        data.batch?.success ?? 0,
        data.batch?.failure ?? 0,
        ns.sprintf("%5.2f%%", data.batch?.pct ?? 0),
        data.batch?.id ?? 0,
    ])
  }

  ns.print(renderTable(ns, table));
}

export async function main(ns :NS): Promise<void> {
  ns.disableLog("getServerUsedRam");
  ns.disableLog("scan");
  ns.disableLog("asleep");

  const flags = ns.flags([
    ["interval", 1000],
  ]) as Flags

  while (true) {
    ns.clearLog();
    await printStatus(ns);
    await ns.asleep(flags["interval"]);
  }
}