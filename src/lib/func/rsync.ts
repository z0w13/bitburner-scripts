import { NS } from "@ns"

export default async function rsync(
  ns: NS,
  source: string,
  target: string,
  files: Array<string | RegExp>,
  overwrite = false,
): Promise<boolean> {
  const checkFiles = files.map((f) => (f instanceof RegExp ? ns.ls(source).filter((tf) => f.test(tf)) : f)).flat()
  const copyFiles = checkFiles.filter((f) => ns.fileExists(f, source) && (!ns.fileExists(f, target) || overwrite))

  if (copyFiles.length === 0) {
    return true
  }

  return await ns.scp(copyFiles, target, source)
}
