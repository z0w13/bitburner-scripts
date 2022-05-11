import { getGlobalState } from "/lib/shared/GlobalStateManager"

export function getUniqueId(): string {
  const state = getGlobalState()

  state.uniqId++
  return `${Date.now()}-${state.uniqId.toString().padStart(8, "0")}`
}
