import { NS } from "@ns"

export function sum(values: Array<number>): number {
  return values.reduce((acc, val) => acc + val, 0)
}

export function sortFunc<T>(getter: (v: T) => number, desc = false): (a: T, b: T) => number {
  return function (a: T, b: T): number {
    if (desc) {
      return getter(b) - getter(a)
    } else {
      return getter(a) - getter(b)
    }
  }
}

export function isScriptRunning(ns: NS, file: string, host: string, args?: Array<string>): boolean {
  if (args) {
    return ns.isRunning(file, host, ...args)
  } else {
    return ns.ps(host).filter((p) => p.filename === file).length > 0
  }
}
