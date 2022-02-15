import { NS } from '@ns'

interface Flags {
  target: string
  threads: number
  delay: number
}

export async function main(ns : NS) : Promise<void> {
  const flags = ns.flags([
    ["target", ""],
    ["threads", 1],
    ["delay", 0],
  ]) as Flags;

  if (flags.target.length === 0) {
    ns.tprintf("ERROR: %s - %s No target specified", ns.getHostname(), ns.getScriptName());
    return
  }

  await ns.asleep(flags.delay)
  await ns.weaken(flags.target, { threads: flags.threads });
}