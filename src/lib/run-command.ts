import { NS } from "@ns"
import { Command } from "/lib/objects"
import runCommandRaw from "/lib/run-command-raw"

interface RunCommandOptions {
  fill?: boolean // If true ignore lack of space available
  args?: Array<string | number>
}

export default function runCommand(ns: NS, cmd: Command, opts: RunCommandOptions = {}): Array<number> {
  opts.args ??= []
  opts.fill ??= false

  return runCommandRaw(ns, {
    script: cmd.script,
    threads: cmd.threads,
    fill: opts.fill ?? false,
    args: ["--target", cmd.target, "--threads", "__HOST_THREADS__", ...opts.args],
  })
}
