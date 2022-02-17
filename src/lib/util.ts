import {NS} from "@ns"
import { notStrictEqual } from "assert"

export function sum(values: Array<number>): number {
  return values.reduce((acc, val) => acc + val, 0)
}

export function isScriptRunning(ns: NS, file: string, host: string, args?: Array<string>) : boolean {
  if (args) {
    return ns.isRunning(file, host, ...args)
  } else {
    return ns.ps(host).filter(p => p.filename === file).length > 0
  }
}
