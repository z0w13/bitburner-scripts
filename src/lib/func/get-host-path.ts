import { NS } from "@ns"
import { DAEMON_SERVER } from "/config"
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
  const tree = getHostTree(ns, DAEMON_SERVER)
  return recursor(targetHost, tree)
}
