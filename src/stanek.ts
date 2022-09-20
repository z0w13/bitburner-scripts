import { Fragment, NS } from "@ns"

export async function main(ns: NS): Promise<void> {
  const fragmentMap: Record<number, Fragment> = {}
  for (const fragDef of ns.stanek.fragmentDefinitions()) {
    fragmentMap[fragDef.id] = fragDef
  }

  ns.disableLog("ALL")

  while (true) {
    const frags = ns.stanek.activeFragments()

    for (const frag of frags) {
      const def = fragmentMap[frag.id]
      if (!def) {
        continue
      }

      // FragmentType.Booster (Need to not import so we can copy it)
      if (def.type === 18) {
        continue
      }

      const _res = await ns.stanek.chargeFragment(frag.x, frag.y)
      ns.print(`Charged ID: ${frag.id} of type ${def.type} to ${frag.numCharge}`)
    }

    await ns.asleep(50)
  }
}
