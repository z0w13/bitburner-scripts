import { NS } from "@ns"

export default async function waitForTime(ns: NS, unixMs: number): Promise<void> {
  //ns.print("waitForTime waiting for ", Math.floor((unixMs - new Date().getTime()) / 1000), " seconds")
  while (new Date().getTime() < unixMs) {
    await ns.asleep(1000)
  }
}
