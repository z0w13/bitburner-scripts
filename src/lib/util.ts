import type { Server } from "@ns"
import { PERCENTAGE_TO_HACK } from "/config"
import { CONSTANTS } from "/game-constants"

export function sum(values: ReadonlyArray<number>): number {
  return values.reduce((acc, val) => acc + val, 0)
}

type Comparable = string | number | boolean

export function sortFunc<T>(getter: (v: T) => Comparable, desc = false): (a: T, b: T) => number {
  return function (a: T, b: T): number {
    const aVal = getter(a)
    const bVal = getter(b)

    if (aVal > bVal) {
      return desc ? -1 : 1
    } else if (aVal === bVal) {
      return 0
    } else {
      return desc ? 1 : -1
    }
  }
}

export function filterUndefinedFunc<T>(): (
  value: T | undefined,
  index: number,
  array: (T | undefined)[],
) => value is T {
  return (value: T | undefined, _index: number, _array: (T | undefined)[]): value is T => value !== undefined
}

export function formatNum(ns: NS, value: number, fractionalDigits = 2, suffixStart = 1_000): string {
  if (value === Infinity) {
    return "∞"
  }
  return ns.formatNumber(value, fractionalDigits, suffixStart).replace(",", " ")
}

export function formatMoney(ns: NS, value: number, fractionalDigits = 2, suffixStart = 1_000): string {
  return "$" + formatNum(ns, value, fractionalDigits, suffixStart)
}

export function formatGiB(ns: NS, value: number, fractionalDigits = 2): string {
  return ns.formatRam(value, fractionalDigits).replace(",", " ")
}

export function formatDate(ns: NS, date: Date, includeDate = true): string {
  if (includeDate) {
    return ns.sprintf(
      "%04d-%02d-%02d %02d:%02d:%02d",
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    )
  } else {
    return ns.sprintf("%02d:%02d:%02d", date.getHours(), date.getMinutes(), date.getSeconds())
  }
}

export function padZeros(val: number | string, length = 2): string {
  return val.toString().padStart(length, "0")
}

const MillisecondsPerDay = 24 * CONSTANTS.MillisecondsPerHour
const MillisecondsPerMinute = 60 * 1_000
export function formatTime(ms: number, showMs = false): string {
  let sign = ""
  if (ms < 0) {
    sign = "-"
  }

  ms = Math.abs(ms)

  const days = Math.floor(ms / MillisecondsPerDay)
  const msTruncDays = ms % MillisecondsPerDay

  const hours = Math.floor(msTruncDays / CONSTANTS.MillisecondsPerHour)
  const msTruncHours = msTruncDays % CONSTANTS.MillisecondsPerHour

  const minutes = Math.floor(msTruncHours / MillisecondsPerMinute)
  const msTruncMinutes = msTruncHours % MillisecondsPerMinute

  const seconds = Math.floor(msTruncMinutes / 1_000)
  const msTruncSeconds = Math.round(msTruncMinutes % 1_000)

  if (days > 0) {
    return (
      sign +
      days +
      "d" +
      padZeros(hours) +
      "h" +
      padZeros(minutes) +
      "m" +
      padZeros(seconds) +
      "s" +
      (showMs ? padZeros(msTruncSeconds, 3) + "ms" : "")
    )
  }

  if (hours > 0) {
    return (
      sign +
      hours +
      "h" +
      padZeros(minutes) +
      "m" +
      padZeros(seconds) +
      "s" +
      (showMs ? padZeros(msTruncSeconds, 3) + "ms" : "")
    )
  }

  if (minutes > 0) {
    return sign + minutes + "m" + padZeros(seconds) + "s" + (showMs ? padZeros(msTruncSeconds, 3) + "ms" : "")
  }

  if (seconds > 0) {
    return sign + seconds + "s" + (showMs ? padZeros(msTruncSeconds, 3) + "ms" : "")
  }

  return sign + (showMs ? msTruncSeconds + "ms" : "0s")
}

export function notNullMoreThanZero(val: number | undefined | null): boolean {
  if (typeof val !== "number") {
    return false
  }

  return val > 0
}

export function toBool(val: number | boolean | string): boolean {
  if (typeof val === "boolean") {
    return val
  }

  if (typeof val === "number") {
    return val > 0
  }

  return ["yes", "true", "y"].includes(val.toLowerCase())
}

export function stringify(input: unknown): string {
  return JSON.stringify(input, (key: string | number, value: unknown): unknown =>
    value instanceof Set ? Array.from(value) : value,
  )
}

export function getHackServer(server: Server): Server {
  return {
    ...server,

    moneyAvailable: server.moneyMax,
    hackDifficulty: server.minDifficulty,
  }
}

export function getGrowServer(server: Server): Server {
  return {
    ...server,

    moneyAvailable: server.moneyMax * (1 - PERCENTAGE_TO_HACK),
    hackDifficulty: server.minDifficulty,
  }
}

export function getWeakenServer(server: Server, additionalSec: number): Server {
  return {
    ...server,

    hackDifficulty: server.minDifficulty + additionalSec,
  }
}

export function tail(ns: NS, lines: Array<string> | string, lineNum = 10): void {
  if (typeof lines === "string") {
    lines = [lines]
  }

  lines
    .map((l) => l.split("\n"))
    .flat()
    .slice(-lineNum)
    .forEach((l) => ns.print(l))
}

export interface RenderProgressArgs {
  value: number
  min?: number
  max?: number
  width?: number
  segmentSymbols?: string
}

export const SEGMENT_SIMPLE = " -="
export const SEGMENT_FULL = " ░▒▓█"

export function renderProgress(args: RenderProgressArgs): string {
  const value = args.value
  const min = args.min ?? 0
  const max = args.max ?? 100
  const width = args.width ?? 10
  const segmentSymbols = args.segmentSymbols ?? SEGMENT_SIMPLE

  const normalizedMax = max - min
  const normalizedValue = value - min
  const progressInSegments = (normalizedValue / normalizedMax) * width

  let res = ""
  for (let seg = 0; seg < width; seg++) {
    // Segment value is between 0 and 1
    const segVal = Math.max(Math.min(progressInSegments - seg, 1), 0)
    const symbolIdx = Math.round((segmentSymbols.length - 1) * segVal)

    res += segmentSymbols[symbolIdx]
  }

  return res
}
