import { NS } from "@ns"

export default function tailExec(
  ns: NS,
  script: string,
  host: string,
  numThreads?: number,
  ...args: (string | number | boolean)[]
): number {
  const pid = ns.exec(script, host, numThreads, ...args)
  if (pid > 0) {
    ns.tail(pid)
  }

  return pid
}
