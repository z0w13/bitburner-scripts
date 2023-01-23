import type { NS } from "@ns"

export default abstract class BaseAction {
  abstract shouldPerform(ns: NS): boolean
  abstract perform(ns: NS): Promise<boolean>

  isBackground(_ns: NS): boolean {
    return false
  }

  isPerforming(ns: NS): boolean {
    // If we're a background task we aren't ever "performing" as we're instant
    return !this.isBackground(ns)
  }

  toString(): string {
    return `<${this.constructor.name}>`
  }
}
