import { NS } from "@ns"
import { getSleeves, SleeveData, SleeveTaskType } from "/lib/SleeveUtil"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class ManageSleevesAction extends BaseAction {
  isPerforming(_ns: NS): boolean {
    return false
  }

  async manageSleeve(ns: NS, sleeve: SleeveData): Promise<boolean> {
    if (sleeve.info.shock > 0) {
      ns.print("ERROR: Shock > 0, please implement shock recovery")
      return false
    }

    if (sleeve.info.sync < 100) {
      ns.print("ERROR: Sync < 100, please implement syncing")
      return false
    }

    if (sleeve.task.type === SleeveTaskType.Idle) {
      return ns.sleeve.setToCommitCrime(sleeve.index, "Larceny")
    }

    return true
  }

  async perform(ns: NS): Promise<boolean> {
    getSleeves(ns).map(async (sleeve) => await this.manageSleeve(ns, sleeve))

    return true
  }

  shouldPerform(_ns: NS): boolean {
    return true
  }

  isBackground(): boolean {
    return true
  }
}
