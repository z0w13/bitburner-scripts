import { HwgCommand, HwgCommandState, HwgState } from "/lib/shared/Objects"

export type GlobalThis = typeof globalThis

export interface HackResult {
  target: string
  batchId?: string
  money: number
}

export interface PlayerSettings {
  passiveOnly: boolean
  enableHacknet: boolean
  focusHacking: boolean
  autoReset: boolean
  createGang: boolean
  createCorp: boolean
}

export interface BasicHwgwState {
  target: string
  stage: string
  doneAt: number
}

export interface BatchHwgwState {
  target: string
  stage: string
  batches: number
  doneAt: number
}

export interface GlobalState {
  uniqId: number
  hwgState: Record<string, HwgCommandState>
  basicHwgwState: Record<string, BasicHwgwState>
  batchHwgwState: Record<string, BatchHwgwState>
  hackResults: Array<HwgCommandState>
  hackStats: Record<string, HostHackStats>
  drainingServers: Set<string>
  playerSettings: PlayerSettings
}

export interface SerializedGlobalState {
  basicHwgwState: Record<string, BasicHwgwState>
  batchHwgwState: Record<string, BatchHwgwState>
  hackResults: Array<HwgCommandState>
  hackStats: Record<string, HostHackStats>
  drainingServers: Array<string>
  playerSettings: PlayerSettings
}

export interface HostHackStats {
  host: string
  amount: number
  startedAt: number
  lastResult: number
  totalHacks: number
  failedBecauseSecurity: number
}

const globalStateDefaults: GlobalState = {
  uniqId: 0,
  hwgState: {},
  hackResults: [],
  basicHwgwState: {},
  batchHwgwState: {},
  hackStats: {},
  drainingServers: new Set<string>(),
  playerSettings: {
    passiveOnly: false,
    focusHacking: true,
    enableHacknet: false,
    autoReset: false,
    createGang: true,
    createCorp: false,
  },
}

export default class GlobalStateManager {
  setPlayerSetting(setting: keyof PlayerSettings, value: boolean) {
    this.state.playerSettings[setting] = value
  }

  private state!: GlobalState

  constructor(global?: GlobalThis) {
    if (!global) {
      global = globalThis
    }

    this.restore({}, global)
  }

  registerHackResult(result: HwgCommandState) {
    if (result.command !== HwgCommand.Hack) {
      return
    }

    if (!(result.target in this.state.hackStats)) {
      this.state.hackStats[result.target] = {
        host: result.target,
        startedAt: Date.now(),
        lastResult: Date.now(),
        amount: result.result,
        totalHacks: 1,
        failedBecauseSecurity: result.state === HwgState.SecurityTooHigh ? 1 : 0,
      }
    } else {
      this.state.hackStats[result.target].lastResult = Date.now()
      this.state.hackStats[result.target].amount += result.result
      this.state.hackStats[result.target].totalHacks += 1
      if (result.state === HwgState.SecurityTooHigh) {
        this.state.hackStats[result.target].failedBecauseSecurity += 1
      }
    }
  }

  processResults(): void {
    while (this.state.hackResults.length > 0) {
      const res = this.state.hackResults.pop()
      if (!res) {
        break
      }

      this.registerHackResult(res)
    }
  }

  getState(): GlobalState {
    return this.state
  }

  getHackStats(): Record<string, HostHackStats> {
    return this.state.hackStats
  }

  resetHackStats(): void {
    for (const stat of Object.values(this.state.hackStats)) {
      stat.amount = 0
      stat.totalHacks = 0
      stat.lastResult = Date.now()
      stat.startedAt = Date.now()
    }
  }

  public serialize(): string {
    return JSON.stringify(this.state, (key: string | number, value: unknown): unknown =>
      value instanceof Set ? Array.from(value) : value,
    )
  }

  public restore(snapshot: Partial<SerializedGlobalState>, global?: GlobalThis): void {
    if (!global) {
      global = globalThis
    }

    global.__globalState = {
      ...globalStateDefaults,
      ...(global.__globalState ?? {}),
      ...snapshot,

      drainingServers: new Set(snapshot.drainingServers),
      playerSettings: {
        ...globalStateDefaults.playerSettings,
        ...(global.__globalState?.playerSettings ?? {}),
        ...snapshot.playerSettings,
      },
    }

    for (const host in global.__globalState?.hackStats) {
      if (!global.__globalState.hackStats[host].failedBecauseSecurity) {
        global.__globalState.hackStats[host].failedBecauseSecurity = 0
      }
    }

    this.state = global.__globalState
  }
}

export function getGlobalState(global?: GlobalThis): GlobalState {
  return new GlobalStateManager(global).getState()
}
