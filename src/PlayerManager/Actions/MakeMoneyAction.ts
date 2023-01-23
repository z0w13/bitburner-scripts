import type { NS } from "@ns"
import { getBestCrime } from "/data/Crimes"
import { getBestJob } from "/data/Jobs"
import BaseAction from "/PlayerManager/Actions/BaseAction"
import CrimeAction from "/PlayerManager/Actions/CrimeAction"
import WorkAction from "/PlayerManager/Actions/WorkAction"

export default class MakeMoneyAction extends BaseAction {
  protected crimeAction = new CrimeAction()
  protected workAction = new WorkAction()

  getBestAction(ns: NS): BaseAction | null {
    const crime = getBestCrime(ns)
    const job = getBestJob(ns)

    // If we have both return the one with the highest income
    if (crime && job) {
      return crime.profitPerSec > job.salary ? this.crimeAction : this.workAction
    }

    // If we have neither, null it is
    if (!crime && !job) {
      return null
    }

    // If we have a job that must mean `crime` is null so return that, otherwise return crime
    return job !== null ? this.workAction : this.crimeAction
  }

  shouldPerform(ns: NS): boolean {
    return this.getBestAction(ns)?.shouldPerform(ns) ?? false
  }

  isPerforming(ns: NS): boolean {
    return this.getBestAction(ns)?.isPerforming(ns) ?? false
  }

  async perform(ns: NS): Promise<boolean> {
    return this.getBestAction(ns)?.perform(ns) ?? false
  }
}
