import { NS } from "@ns";
import renderTable from "/lib/render-table";
import { Command } from "/lib/objects"
import { SCRIPT_WGWH_LOOP } from './constants';

interface Flags {
  interval: number
}

interface ProcData {
  target: string
  money: number
  exp: number
  script: string
  time: number
  threads: number,
}

async function printStatus(ns: NS) {
  const procs = ns.ps("home");
  const procData: Array<ProcData> = [];

  let totalMoney = 0;
  let totalExp = 0;
  let totalThreads = 0;
  for (const proc of procs) {
    if (proc.filename !== SCRIPT_WGWH_LOOP) {
      continue;
    }

    const procFlags: Record<string, string> = {}
    try {
      for (let i=0; i<proc.args.length-1; i+=2) {
        procFlags[proc.args[i].substring(2)] = proc.args[i+1];
      }

      let data: Command | null = null
      try {
        data = JSON.parse(ns.getScriptLogs(proc.filename, "home", ...proc.args).at(-1) ?? "{}");
      } catch  (e) {
        //
      }

      const money = ns.getScriptIncome(proc.filename, "home", ...proc.args)
      const exp = ns.getScriptExpGain(proc.filename, "home", ...proc.args)

      totalMoney += money
      totalExp += exp
      totalThreads += data?.threads ?? 0

      procData.push({
        target: 
        procFlags["target"], 
        money,
        exp,
        script: data?.script ?? "",
        time: Math.ceil((data?.time ?? 0) / 1000),
        threads: data?.threads ?? 0,
      });
    } catch (e) {
      //
    }
  }

  const table: Array<Array<unknown>> = [
    ["Target", "Exp/s", "Money/s", "Money (%)", "Security", "Threads", "Script", "Time"]
  ];

  for (const data of procData) {
    const server = ns.getServer(data.target);

    table.push([
        data.target,
        ns.sprintf("%7.2f", data.exp),
        ns.nFormat(data.money, "$0.00a"),
        ns.sprintf("%s (%5.2f%%)", ns.nFormat(server.moneyAvailable, "$0.00a"), (server.moneyAvailable / server.moneyMax) * 100),
        ns.sprintf("%5.2f/%5.2f", server.hackDifficulty, server.minDifficulty),
        ns.nFormat(data.threads, "0,0"),
        data.script,
        data.time,
    ])
  }

  table.push([
    "Total: " + procData.length,
    ns.sprintf("%7.2f", totalExp),
    ns.nFormat(totalMoney, "$0.00a"),
    "",
    "",
    ns.nFormat(totalThreads, "0,0"),
  ])

  ns.print(renderTable(ns, table, true, true));
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