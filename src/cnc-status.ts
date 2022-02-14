import { NS } from "@ns";
import renderTable from "/lib-render-table";

interface Flags {
  interval: number
}

interface ProcData {
  target: string
  money: number
  exp: number
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

      procData.push({
        target: 
        procFlags["target"], 
        money: ns.getScriptIncome(proc.filename, "home", ...proc.args),
        exp: ns.getScriptExpGain(proc.filename, "home", ...proc.args),
      });
    } catch (e) {
      //
    }
  }


  const procDataConsolidated: Record<string, ProcData> = {};
  for (const data of procData) {
    const key = data.target;
    if (!procDataConsolidated[key]) {
      procDataConsolidated[key] = {
        target: data.target,
        money: data.money,
        exp: data.exp,
      }
    } else {
      procDataConsolidated[key].money += data.money;
      procDataConsolidated[key].exp += data.exp;
    }
  }

  const table: Array<Array<string>> = [
    ["Target", "Exp/s", "Money/s", "Money (%)", "Security"]
  ];

  for (const key in procDataConsolidated) {
    const data = procDataConsolidated[key];
    const server = ns.getServer(data.target);

    table.push([
        data.target,
        ns.sprintf("%7.2f", data.exp),
        ns.nFormat(data.money, "$0.00a"),
        ns.sprintf("%s (%5.2f%%)", ns.nFormat(server.moneyAvailable, "$0.00a"), (server.moneyAvailable / server.moneyMax) * 100),
        ns.sprintf("%5.2f", server.hackDifficulty),
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