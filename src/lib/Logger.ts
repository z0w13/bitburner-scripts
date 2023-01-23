import type { NS } from "@ns"
import { LOG_LEVELS } from "/config"
import { LogLevel } from "/lib/objects"

type LogFunc = (message: string) => void

export default class Logger {
  ns: NS
  level: LogLevel
  prefix: string
  fmt: string
  logFunc: LogFunc

  constructor(
    ns: NS,
    level: LogLevel = LogLevel.Warning,
    name = "main",
    logFunc: LogFunc = ns.print,
    fmt = "%s [%s] %s: %s",
  ) {
    this.ns = ns
    // Override log level if specified in LOG_LEVELS
    if (name in LOG_LEVELS) {
      this.level = LOG_LEVELS[name]
    } else {
      this.level = level
    }
    this.prefix = name
    this.logFunc = logFunc
    this.fmt = fmt
  }

  setLogLevel(newLevel: LogLevel): void {
    this.level = newLevel
  }

  levelToString(level: LogLevel): string {
    switch (level) {
      case LogLevel.Error:
        return "ERROR"
        break
      case LogLevel.Warning:
        return "WARNING"
        break
      case LogLevel.Info:
        return "INFO"
        break
      case LogLevel.Debug:
        return "DEBUG"
        break
      default:
        return "UNKNOWN"
        break
    }
  }

  error(fmt: string, ...args: Array<unknown>): void {
    if (this.level >= LogLevel.Error) {
      this.log(LogLevel.Error, fmt, ...args)
    }
  }

  warning(fmt: string, ...args: Array<unknown>): void {
    if (this.level >= LogLevel.Warning) {
      this.log(LogLevel.Warning, fmt, ...args)
    }
  }

  info(fmt: string, ...args: Array<unknown>): void {
    if (this.level >= LogLevel.Info) {
      this.log(LogLevel.Info, fmt, ...args)
    }
  }

  debug(fmt: string, ...args: Array<unknown>): void {
    if (this.level >= LogLevel.Debug) {
      this.log(LogLevel.Debug, fmt, ...args)
    }
  }

  getTime(): string {
    const now = new Date()
    return this.ns.sprintf("%02d:%02d:%02d", now.getHours(), now.getMinutes(), now.getSeconds())
  }

  logAndToast(level: LogLevel, fmt: string, ...args: Array<unknown>): void {
    this.ns.toast(this.ns.vsprintf(fmt, args))
    this.log(level, fmt, ...args)
  }

  log(level: LogLevel, fmt: string, ...args: Array<unknown>): void {
    const formatString = this.ns.sprintf(this.fmt, this.getTime(), this.prefix, this.levelToString(level), fmt)
    this.logFunc(this.ns.vsprintf(formatString, args))
  }
}
