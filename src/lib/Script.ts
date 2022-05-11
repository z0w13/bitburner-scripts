import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"

export type ScriptArg = string | number | boolean

export default class Script {
  file: string
  ram: number
  flags: Record<string, ScriptArg>
  args: Array<ScriptArg>

  constructor(file: string, ram: number, args: Array<ScriptArg> = [], flags: Record<string, ScriptArg> = {}) {
    this.file = file
    this.ram = ram
    this.flags = flags
    this.args = args
  }

  getScriptArgs(): Array<ScriptArg> {
    return Object.entries(this.flags)
      .map(([flag, val]) => ["--" + flag, val])
      .flat()
      .concat(this.args)
  }

  static fromFile(ns: NS, file: string, args: Array<ScriptArg> = [], flags: Record<string, ScriptArg> = {}) {
    return new Script(file, ns.getScriptRam(file, DAEMON_SERVER), args, flags)
  }
}
