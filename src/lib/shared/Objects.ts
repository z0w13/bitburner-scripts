export enum HwgCommand {
  Hack = "HACK",
  Weaken = "WEAKEN",
  Grow = "GROW",
}

export enum HwgState {
  Waiting = "WAITING",
  Running = "RUNNING",
  Success = "SUCCESS",
  SecurityTooHigh = "SECURITY_TOO_HIGH",
}

export const HWG_FINISHED_STATE = [HwgState.Success, HwgState.SecurityTooHigh]

export interface HwgCommandState {
  id: string
  target: string
  command: HwgCommand
  state: HwgState
  result: number
}
