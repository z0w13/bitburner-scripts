export enum TermColor {
  Black = "\u001b[30m",
  Red = "\u001b[31m",
  Green = "\u001b[32m",
  Yellow = "\u001b[33m",
  Blue = "\u001b[34m",
  Magenta = "\u001b[35m",
  Cyan = "\u001b[36m",
  White = "\u001b[37m",
  BrightBlack = "\u001b[30;1m",
  BrightRed = "\u001b[31;1m",
  BrightGreen = "\u001b[32;1m",
  BrightYellow = "\u001b[33;1m",
  BrightBlue = "\u001b[34;1m",
  BrightMagenta = "\u001b[35;1m",
  BrightCyan = "\u001b[36;1m",
  BrightWhite = "\u001b[37;1m",
  Reset = "\u001b[0m",
}

export function wrapColor(color: TermColor, val: string): string {
  //return val
  return color + val + TermColor.Reset
}

export function formatChangeColor(value: number | boolean, display: unknown, thresh = 0): string {
  const renderVal = display !== null ? String(display) : String(value)

  if (typeof value === "boolean") {
    return wrapColor(value ? TermColor.Green : TermColor.Red, renderVal)
  }

  if (value > thresh) {
    return wrapColor(TermColor.Green, renderVal)
  }
  if (value < -thresh) {
    return wrapColor(TermColor.Red, renderVal)
  }

  return renderVal
}

export function ansiRegex(): RegExp {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
  ].join("|")

  return new RegExp(pattern, "g")
}
