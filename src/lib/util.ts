import { CONSTANTS } from "/game-constants"

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

export function filterUndefinedFunc<T>(): (
  value: T | undefined,
  index: number,
  array: (T | undefined)[],
) => value is T {
  return (value: T | undefined, _index: number, _array: (T | undefined)[]): value is T => value !== undefined
}

export function formatNum(ns: NS, value: number, fmt = "0,0.00"): string {
  return ns.nFormat(value, fmt).replaceAll(",", " ")
}

export function formatMoney(ns: NS, value: number, fmt = "$0,0.00a"): string {
  return formatNum(ns, value, fmt)
}

export function formatBytes(ns: NS, value: number, fmt = "0,0.00ib"): string {
  return formatNum(ns, value, fmt)
}

export function formatGiB(ns: NS, value: number, fmt = "0,0.00ib"): string {
  return formatBytes(ns, value * 1024 ** 3, fmt)
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

const MillisecondsPerDay = 24 * CONSTANTS.MillisecondsPerHour
const MillisecondsPerMinute = 60 * 1_000
export function formatTime(ms: number, showMs = false): string {
  const days = Math.floor(ms / MillisecondsPerDay)
  const msTruncDays = ms % MillisecondsPerDay

  const hours = Math.floor(msTruncDays / CONSTANTS.MillisecondsPerHour)
  const msTruncHours = msTruncDays % CONSTANTS.MillisecondsPerHour

  const minutes = Math.floor(msTruncHours / MillisecondsPerMinute)
  const msTruncMinutes = msTruncHours % MillisecondsPerMinute

  const seconds = Math.floor(msTruncMinutes / 1_000)
  const msTruncSeconds = Math.round(msTruncMinutes % 1_000)

  if (days > 0) {
    return days + "d" + hours + "h" + minutes + "m" + seconds + "s" + (showMs ? msTruncSeconds + "ms" : "")
  }

  if (hours > 0) {
    return hours + "h" + minutes + "m" + seconds + "s" + (showMs ? msTruncSeconds + "ms" : "")
  }

  if (minutes > 0) {
    return minutes + "m" + seconds + "s" + (showMs ? msTruncSeconds + "ms" : "")
  }

  if (seconds > 0) {
    return seconds + "s" + (showMs ? msTruncSeconds + "ms" : "")
  }

  return msTruncSeconds + "ms"
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
