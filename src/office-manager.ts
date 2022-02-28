import { NS } from "@ns"
import setupPolyfill from "/lib/ns-polyfill"

export async function main(ns: NS): Promise<void> {
  setupPolyfill(ns)
  //
}
