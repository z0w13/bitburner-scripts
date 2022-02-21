import { NS } from "@ns"
import { LOG_LEVELS } from "/config"
import { LogLevel } from "/lib/objects"

export default class Logger {
  ns: NS
  level: LogLevel
  prefix: string
  fmt: string

  constructor(ns: NS, level: LogLevel = LogLevel.Warning, name = "main", fmt = "%s [%s] %s: %s") {
    this.ns = ns
    // Override log level if specified in LOG_LEVELS
    if (name in LOG_LEVELS) {
      this.level = LOG_LEVELS[name]
    } else {
      this.level = level
    }
    this.prefix = name
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

  log(level: LogLevel, fmt: string, ...args: Array<unknown>): void {
    const formatString = this.ns.sprintf(this.fmt, this.getTime(), this.prefix, this.levelToString(level), fmt)
    this.ns.print(this.ns.vsprintf(formatString, args))
  }
}
