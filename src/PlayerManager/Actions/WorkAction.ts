import type { NS } from "@ns"
import { getBestJob } from "@/data/Jobs"
import getPlayerAction, { PlayerActionType } from "@/lib/func/get-player-action"
import BaseAction from "@/PlayerManager/Actions/BaseAction"

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
    const action = getPlayerAction(ns)
    const bestJob = getBestJob(ns)

    return bestJob !== null && action.type === PlayerActionType.WorkForCompany && action.company === bestJob.company
  }

  async perform(ns: NS): Promise<boolean> {
    const bestJob = getBestJob(ns)
    if (!bestJob) {
      return false
    }

    if (!this.getJob(ns, bestJob.company)) {
      if (!ns.singularity.applyToCompany(bestJob.company, bestJob.name)) {
        return false
      }
    }

    const shouldFocus = !ns.singularity.getOwnedAugmentations().includes("Neuroreceptor Management Implant")
    return ns.singularity.workForCompany(bestJob.company, shouldFocus)
  }
}
