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

