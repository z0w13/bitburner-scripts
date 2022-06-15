export async function main(ns) {
  ns.disableLog("ALL")

  while (true) {
    await ns.asleep(1000)
    ns.heart.break()
  }
}
