import { NS } from "@ns"
import { getBestJob } from "/data/Jobs"
import { CONSTANTS } from "/game-constants"
import { ActionType } from "/PlayerManager/Actions/ActionType"
import BaseAction from "/PlayerManager/Actions/BaseAction"

export default class WorkAction extends BaseAction {
  getJob(ns: NS, company: string): string | null {
    const jobs: Record<string, string> = ns.getPlayer().jobs
    if (company in jobs) {
      return jobs[company]
    }

    return null
  }

  shouldPerform(ns: NS): boolean {
    ns.print(getBestJob(ns)?.salary)
    return getBestJob(ns) !== null
  }

  isPerforming(ns: NS): boolean {
    const player = ns.getPlayer()
    const bestJob = getBestJob(ns)

    return (
      bestJob !== null &&
      (player.workType === CONSTANTS.WorkTypeCompany || player.workType === CONSTANTS.WorkTypeCompanyPartTime) &&
      player.location === bestJob.company
    )
  }

  perform(ns: NS): boolean {
    const bestJob = getBestJob(ns)
    if (!bestJob) {
      return false
    }

    if (!this.getJob(ns, bestJob.company)) {
      if (!ns.applyToCompany(bestJob.company, bestJob.name)) {
        return false
      }
    }

    return ns.workForCompany(bestJob.company)
  }

  getType(): ActionType {
    return ActionType.WORK
  }
}
