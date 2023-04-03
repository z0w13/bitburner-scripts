import type { NS } from "@ns"
import { DAEMON_SERVER } from "@/config"
import { STATIC_DATA } from "@/constants"
import { StaticData } from "@/lib/objects"

export default function getStaticData(ns: NS): StaticData | null {
  if (!ns.fileExists(STATIC_DATA, DAEMON_SERVER)) {
    return null
  }

  try {
    return JSON.parse(ns.read(STATIC_DATA).toString()) as StaticData
  } catch (e) {
    ns.tprint("ERROR: ", e)
    return null
  }
}
