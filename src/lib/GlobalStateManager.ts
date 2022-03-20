import { Job } from "/JobScheduler/JobObjects"

type GlobalThis = typeof globalThis

export interface HackResult {
  target: string
  batchId?: string
  money: number
}

export interface PlayerSettings {
  enableHacknet: boolean
  focusHacking: boolean
  autoReset: boolean
  createGang: boolean
  createCorp: boolean
}

export interface GlobalState {
  jobs: Array<Job>
  hackResults: Array<HackResult>
  hackStats: Record<string, HostHackStats>
  drainingServers: Set<string>
  playerSettings: PlayerSettings
}

export interface HostHackStats {
  host: string
  amount: number
  startedAt: number
  lastResult: number
  totalHacks: number
}

export default class GlobalStateManager {
  setPlayerSetting(setting: keyof PlayerSettings, value: boolean) {
    this.state.playerSettings[setting] = value
  }

  private state: GlobalState

  constructor(global?: GlobalThis) {
    if (!global) {
      global = globalThis
    }

    this.state = global.__globalState
    this.restore({}, global)
  }

  registerHackResult(result: HackResult) {
    if (!(result.target in this.state.hackStats)) {
      this.state.hackStats[result.target] = {
        host: result.target,
        startedAt: Date.now(),
        lastResult: Date.now(),
        amount: result.money,
        totalHacks: 1,
      }
    } else {
      this.state.hackStats[result.target].lastResult = Date.now()
      this.state.hackStats[result.target].amount += result.money
      this.state.hackStats[result.target].totalHacks += 1
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

  public restore(snapshot: Partial<GlobalState>, global?: GlobalThis): void {
    if (!global) {
      global = globalThis
    }

    global.__globalState = {
      ...global.__globalState,
      ...snapshot,
    }

    global.__globalState = {
      jobs: [],
      hackResults: [],
      hackStats: {},
      drainingServers: new Set<string>(),
      playerSettings: {
        focusHacking: true,
        enableHacknet: false,
        autoReset: false,
        createGang: true,
        createCorp: false,

        ...((global.__globalState.playerSettings as Partial<PlayerSettings>) ?? {}),
      },

      ...((global.__globalState as Partial<GlobalState>) ?? {}),
    }

    this.state = global.__globalState
  }
}
