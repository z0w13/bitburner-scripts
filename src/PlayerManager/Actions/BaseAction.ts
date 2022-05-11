import { NS } from "@ns"

export default abstract class BaseAction {
  abstract shouldPerform(ns: NS): boolean
  abstract isPerforming(ns: NS): boolean
  abstract perform(ns: NS): Promise<boolean>

  isBackground(): boolean {
    return false
  }

  shouldContinue(): boolean {
    return false
  }

  toString(): string {
    return `<${this.constructor.name}>`
  }
}
