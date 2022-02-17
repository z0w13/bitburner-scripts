import ServerWrapper from "/lib/server-wrapper"

export interface Script {
  file: string
  ram: number
}

export interface Command {
  target: ServerWrapper
  threads: number
  ram: number
  time: number
  security: number
  script: Script
}

export type FlagSchema = Array<[string, string | number | boolean | string[]]>
