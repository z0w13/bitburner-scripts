import { NS } from "@ns"

export default function getScriptPid(ns: NS, file: string, host: string, args?: Array<string>): number {
  return args
    ? ns.getRunningScript(file, host, ...args)?.pid ?? 0
    : ns.ps(host).filter((p) => p.filename === file)[0]?.pid ?? 0
}
