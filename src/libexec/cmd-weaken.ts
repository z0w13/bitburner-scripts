import { NS } from "@ns"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"
import { updateHwgCommand } from "/lib/shared/CommandResult"
import { HwgCommand, HwgState } from "/lib/shared/Objects"
import { getUniqueId } from "/lib/shared/util"

interface Flags {
  target: string
  threads: number
  delay: number
  endTime: number
  commandTime: number
}

export async function main(ns: NS): Promise<void> {
  const flags = ns.flags([
    ["target", ""],
    ["threads", 1],
    ["delay", 0],
    ["endTime", 0],
    ["commandTime", 0],
  ]) as Flags & ScriptArgs

  if (flags.target.length === 0) {
    ns.tprintf("ERROR: %s - %s No target specified", ns.getHostname(), ns.getScriptName())
    return
  }

  const id = getUniqueId()

  if (flags.endTime > 0) {
    flags.delay = flags.endTime - Date.now() - flags.commandTime
  }

  if (flags.delay > 0) {
    updateHwgCommand({
      command: HwgCommand.Weaken,
      state: HwgState.Waiting,
      target: flags.target,
      result: 0,
      id,
    })
    await ns.asleep(flags.delay)
  }

  updateHwgCommand({
    command: HwgCommand.Weaken,
    state: HwgState.Running,
    target: flags.target,
    result: 0,
    id,
  })

  const secReduced = await ns.weaken(flags.target, { threads: flags.threads })

  updateHwgCommand({
    command: HwgCommand.Weaken,
    state: HwgState.Success,
    target: flags.target,
    result: secReduced,
    id,
  })
}
