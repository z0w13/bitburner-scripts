import type { NS, ScriptArg } from "@ns"

export type ScriptArgs = [string: ScriptArg]

export default function parseFlags<T>(
  ns: NS,
  schema: [string, string | number | boolean | string[]][],
): T & ScriptArgs {
  return ns.flags(schema) as T & ScriptArgs
}
