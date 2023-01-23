import { NS } from "@ns"
import parseFlags from "/lib/parseFlags"

interface Flags {
  filename: string
  content: string
  mode: "a" | "w"
}

export async function main(ns: NS): Promise<void> {
  const flags = parseFlags<Flags>(ns, [
    ["filename", ""],
    ["content", ""],
    ["mode", "w"],
  ])

  if (flags.filename.length === 0) {
    ns.print("Error: no filename specified")
    return
  }

  ns.write(flags.filename, flags.content, flags.mode)
}
