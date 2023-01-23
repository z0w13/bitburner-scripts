import { NS } from "@ns"
import parseFlags from "/lib/parseFlags"

interface Flags {
  target: string
  threads: number
  delay: number
  endTime: number
  commandTime: number
}

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags<Flags>(ns, [
    ["target", ""],
    ["threads", 1],
    ["delay", 0],
    ["endTime", 0],
    ["commandTime", 0],
  ])

  if (flags.target.length === 0) {
    ns.tprintf("ERROR: %s - %s No target specified", ns.getHostname(), ns.getScriptName())
    return
  }

  if (flags.endTime > 0) {
    flags.delay = flags.endTime - Date.now() - flags.commandTime
  }

  if (flags.delay > 0) {
    await ns.asleep(flags.delay)
  }

  await ns.weaken(flags.target, { threads: flags.threads })
}
