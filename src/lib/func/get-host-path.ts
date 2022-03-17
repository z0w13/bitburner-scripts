import { NS } from "@ns"
import getHostTree, { TreeNode } from "/lib/func/get-host-tree"

function recursor(target: string, current: TreeNode, path: Array<string> = []): Array<string> | false {
  if (current.name === target) {
    return path.concat([current.name])
  }

  for (const node of current.children) {
    const res = recursor(target, node, path.concat([current.name]))
    if (res) {
      return res
    }
  }

  return false
}

export default function getHostPath(ns: NS, targetHost: string): Array<string> | false {
  const tree = getHostTree(ns, "home")
  return recursor(targetHost, tree)
}
