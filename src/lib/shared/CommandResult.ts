import { getGlobalState } from "/lib/shared/GlobalStateManager"
import { HwgCommand, HwgCommandState, HWG_FINISHED_STATE } from "/lib/shared/Objects"

export function updateHwgCommand(commandState: HwgCommandState) {
  const state = getGlobalState()
  if (!HWG_FINISHED_STATE.includes(commandState.state)) {
    state.hwgState[commandState.id] = commandState
    return
  }

  // If we're done push the results and remove from hwgState
  delete state.hwgState[commandState.id]
  if (commandState.command === HwgCommand.Hack) {
    state.hackResults.push(commandState)
  }
}
