import { NS } from "@ns"

export function isScriptRunning(ns: NS, file: string, host: string, args?: Array<string>): boolean {
  if (args) {
    return ns.isRunning(file, host, ...args)
  } else {
    return ns.ps(host).filter((p) => p.filename === file).length > 0
  }
}
