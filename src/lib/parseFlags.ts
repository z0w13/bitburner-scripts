import type { NS, ScriptArg } from "@ns"

export type ScriptArgs = [string: ScriptArg]
type FlagSchema = Record<string, string | number | boolean | string[]>

export default function parseFlags<T extends FlagSchema>(ns: NS, schema: T): T & ScriptArgs {
  return ns.flags(Array.isArray(schema) ? schema : Object.entries(schema)) as T & ScriptArgs
}
