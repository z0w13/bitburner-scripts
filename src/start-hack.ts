import { NS } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)

  ns.spawn("start.js", 1, "--hack")
}
