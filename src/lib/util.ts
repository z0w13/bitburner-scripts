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
