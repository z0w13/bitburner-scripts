import { NS } from "@ns"
import { SERVER_PREFIX } from "/config"
import { sum } from "/lib/util"

export interface TreeNode {
  name: string
  depth: number
  totalBelow: number
  children: Array<TreeNode>
}

export default function getHostTree(ns: NS, targetHost = "home", all = false, parent?: string, depth = 0): TreeNode {
  const foundHosts = ns.scan(targetHost).filter((h) => h !== parent)
  const children = foundHosts
    .map((h) => getHostTree(ns, h, all, targetHost, depth + 1))
    .sort((a, b) => a.totalBelow - b.totalBelow)
    .filter((v) => all || !v.name.startsWith(SERVER_PREFIX))

  return { name: targetHost, depth, totalBelow: children.length + sum(children.map((v) => v.totalBelow)), children }
}
