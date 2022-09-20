import { NS } from "@ns"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"

interface Flags {
  filename: string
  content: string
  mode: "a" | "w"
}

export async function main(ns: NS): Promise<void> {
  const flags = ns.flags([
    ["filename", ""],
    ["content", ""],
    ["mode", "w"],
  ]) as Flags & ScriptArgs

  if (flags.filename.length === 0) {
    ns.print("Error: no filename specified")
    return
  }

  await ns.write(flags.filename, flags.content, flags.mode)
}
