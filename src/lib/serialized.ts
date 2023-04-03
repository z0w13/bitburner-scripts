import { SerializedJob } from "@/JobScheduler/JobObjects"
import { PreppedTargetInfo } from "@/lib/objects"

export interface SerializedDaemonStatus {
  preppedTargets: Array<PreppedTargetInfo>
  lastUpdate: number
  prepLoad: number
  prepOrder: Array<string>
  profitPerSecond: number
  expPerSecond: number
  load: number
  jobs: Array<SerializedJob>
  stopping: boolean
}
