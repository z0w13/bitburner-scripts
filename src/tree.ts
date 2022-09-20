import { NS } from "@ns"
import { ScriptArgs } from "/AdditionalNetscriptDefinitions"
import { DAEMON_SERVER } from "/config"
import getHostTree, { TreeNode } from "/lib/func/get-host-tree"
import { FlagSchema } from "/lib/objects"

const IMPORTANT_HOSTS = new Set(["The-Cave", "I.I.I.I", "run4theh111z", "CSEC", "avmnite-02h"])

const flagSchema: FlagSchema = [
  ["all", false],
  ["host", DAEMON_SERVER],
]

interface Flags {
  all: boolean
  host: string
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  const flags = ns.flags(flagSchema) as Flags & ScriptArgs

  const hosts = getHostTree(ns, flags.host, flags.all)
  printTreeNode(ns, hosts, 0)
}

export function printTreeNode(ns: NS, node: TreeNode, depth = 0, prefix = "", last = false) {
  const symbol = depth === 0 ? "-" : last ? "└" : "├"
  ns.tprintf(
    "%s%s %s (%d) %s",
    prefix,
    symbol,
    node.name,
    node.depth,
    IMPORTANT_HOSTS.has(node.name) ? "!!!!!!!!!!!!!!!!!!" : "",
  )

  const newPrefix = prefix + (last || depth === 0 ? "  " : "│ ")
  node.children.forEach((v, idx, arr) => printTreeNode(ns, v, depth + 1, newPrefix, idx === arr.length - 1))
}
