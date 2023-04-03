import type { NS } from "@ns"
import { renderProgress, RenderProgressArgs } from "@/lib/util"

function assert(ns: NS, actual: unknown, expected: unknown, message?: string): boolean {
  if (actual !== expected) {
    ns.tprint(`ERROR: '${actual}' is not '${expected}' ${message}`)
    return false
  }

  return true
}

export async function main(ns: NS): Promise<void> {
  const testCases: Array<{ args: RenderProgressArgs; expected: string; name: string }> = [
    { args: { value: 0 }, expected: "          ", name: "Empty" },
    { args: { value: 100 }, expected: "==========", name: "Full" },
    { args: { value: 50 }, expected: "=====     ", name: "Half full" },
    { args: { value: 55 }, expected: "=====-    ", name: "Blip" },
    { args: { value: 60, min: 20 }, expected: "=====     ", name: "Positive min" },
    { args: { value: 55, segmentSymbols: " 123456789=" }, expected: "=====5    ", name: "Custom blips" },
    { args: { value: 0, min: -50, max: 50 }, expected: "=====     ", name: "Negative min" },
    { args: { value: 50, width: 20 }, expected: "==========          ", name: "Large progressbar" },
  ]

  for (const testCase of testCases) {
    assert(ns, renderProgress(testCase.args), testCase.expected, `${testCase.name} renders incorrectly`)
  }
}
