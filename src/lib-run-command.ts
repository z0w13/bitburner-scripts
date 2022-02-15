import { NS } from '@ns'
import { Command } from "./lib-objects"
import allocateThreads from './lib-allocate-threads';


export default function runCommand(ns: NS, cmd: Command): Array<number> {
  if (cmd.threads > 0) {
    const pids = allocateThreads(ns, cmd.target, cmd.script, cmd.threads);
    return pids
  } else {
    ns.print("Got cmd with 0 threads ", cmd);
  }

  return []
}
