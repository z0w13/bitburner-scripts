import { NS } from '@ns'

interface Flags {
  target: string
  threads: number
}

export async function main(ns : NS) : Promise<void> {
  const flags = ns.flags([
    ["target", ""],
    ["threads", 1],
  ]) as Flags;

  if (flags.target.length === 0) {
    ns.print("ERROR: No target specified");
    return
  }

  await ns.hack(flags.target, { threads: flags.threads });
}