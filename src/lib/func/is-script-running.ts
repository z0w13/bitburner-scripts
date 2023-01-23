import type { NS } from "@ns"
import getScriptPid from "/lib/func/get-script-pid"

export function isScriptRunning(ns: NS, file: string, host: string, args?: Array<string>): boolean {
  return getScriptPid(ns, file, host, args) > 0
}
