import { NS } from "@ns"
import { STATIC_DATA } from "/constants"
import { StaticData } from "/lib/objects"

export default function getStaticData(ns: NS): StaticData | null {
  if (!ns.fileExists(STATIC_DATA, "home")) {
    return null
  }

  try {
    return JSON.parse(ns.read(STATIC_DATA)) as StaticData
  } catch (e) {
    ns.tprint("ERROR: ", e)
    return null
  }
}
