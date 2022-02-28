import { NS } from "@ns"
import { getHackCommand, getWeakenCommand, getHwBatch } from "/lib/commands-basic"
import { CommandBatch, FlagSchema } from "/lib/objects"
import { BATCH_INTERVAL, SECURITY_WIGGLE } from "/config"
import waitForPids from "/lib/func/wait-for-pids"
import runCommand from "/lib/func/run-command"
import getThreadsAvailable from "/lib/func/get-threads-available"
import ServerBuyer from "/lib/server-buyer"

const flagSchema: FlagSchema = [["target", "n00dles"]]

interface Flags {
  target: string
}

function isMinSecurity(ns: NS, target: string): boolean {
  return ns.getServerSecurityLevel(target) <= ns.getServerMinSecurityLevel(target) * (1 + SECURITY_WIGGLE)
}

async function minSecurity(ns: NS, target: string): Promise<void> {
  while (!isMinSecurity(ns, target)) {
    const command = getWeakenCommand(ns, target)
    await waitForPids(ns, runCommand(ns, command, { fill: true }))
  }
}

async function calcBatch(ns: NS, target: string): Promise<CommandBatch> {
  // Prep
  await minSecurity(ns, target)

  const hackCommand = getHackCommand(ns, target)
  hackCommand.threads = Math.floor(getThreadsAvailable(ns, hackCommand.script) / 10)
  hackCommand.ram = hackCommand.threads * hackCommand.script.ram
  hackCommand.security = ns.hackAnalyzeSecurity(hackCommand.threads)

  // Batchboys
  return getHwBatch(ns, target, hackCommand)
}

// TODO(zowie): Find a way to optimise, probably make command calculation not use ServerWrapper
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags

  const batch = await calcBatch(ns, flags.target)
  const serverBuyer = new ServerBuyer(ns, 8)

  while (true) {
    // We use 2nd script (weaken) as hack is smaller for some reason
    const threads = getThreadsAvailable(ns, batch.commands[1].script)
    const batchStart = Date.now()
    const batches = Math.min(Math.floor(batch.time / BATCH_INTERVAL), Math.floor(threads / batch.threads))
    let batchEnd = 0
    const pids = []

    if (batches === 0) {
      ns.print(ns.sprintf("ERROR: 0 batches scheduled, need %d threads per batch %d available", batch.threads, threads))
      ns.exit()
    }

    for (let curr = 0; curr < batches; curr++) {
      // We have delays, so we can safely schedule grow first to reduce splitting
      pids.push(...runCommand(ns, batch.commands[0], { args: ["batch-" + curr] }))
      pids.push(...runCommand(ns, batch.commands[1], { args: ["batch-" + curr] }))

      batchEnd = Date.now() + batch.time

      await ns.asleep(BATCH_INTERVAL)
    }

    const batchEndDate = new Date(batchEnd)

    ns.print(
      ns.sprintf(
        "INFO: %d batches will take %s seconds and finish at %02d:%02d:%02d",
        batches,
        Math.round((batchEnd - batchStart) / 1000),
        batchEndDate.getHours(),
        batchEndDate.getMinutes(),
        batchEndDate.getSeconds(),
      ),
    )

    await waitForPids(ns, pids.flat(1))

    const script = ns.getRunningScript()
    ns.print(
      ns.sprintf(
        "INFO: Money/s: %.2f Exp/s: %.2f Server Money: %.2f%% Server Sec: %.2f of %d",
        ns.getScriptIncome(script.filename, script.server, ...script.args),
        ns.getScriptExpGain(script.filename, script.server, ...script.args),
        (ns.getServerMoneyAvailable(flags.target) / ns.getServerMaxMoney(flags.target)) * 100,
        ns.getServerSecurityLevel(flags.target),
        ns.getServerMinSecurityLevel(flags.target),
      ),
    )

    // Recalculate batch if player skill changes
    if (!isMinSecurity(ns, flags.target)) {
      await minSecurity(ns, flags.target)
    }

    await serverBuyer.buy(false)
  }

  await ns.asleep(1)
}
