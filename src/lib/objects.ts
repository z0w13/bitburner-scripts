import ServerWrapper from "/lib/server-wrapper"

export interface Command {
  target: ServerWrapper
  threads: number
  ram: number
  time: number
  security: number
  script: string
}

export type FlagSchema = Array<[string, string | number | boolean | string[]]>
