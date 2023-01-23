import { NS, ScriptArg } from "@ns"

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
  ]) as Flags & { [key: string]: ScriptArg | string[] }

  if (flags.filename.length === 0) {
    ns.print("Error: no filename specified")
    return
  }

  ns.write(flags.filename, flags.content, flags.mode)
}
