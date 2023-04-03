import { NS } from "@ns"

interface NSHeart extends NS {
  heart: {
    break: () => number
  }
}

export async function main(ns: NS): Promise<void> {
  const nsHeart = ns as NSHeart
  ns.tprint(nsHeart.heart.break())
}
