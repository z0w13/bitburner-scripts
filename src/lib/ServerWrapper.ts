import { NS, ProcessInfo, Server } from "@ns"
import { getBatch } from "/Command/Formulas"
import {
  PERCENTAGE_TO_HACK,
  HACK_MIN_MONEY,
  SECURITY_WIGGLE,
  MONEY_WIGGLE,
  TARGET_MAX_PREP_WEAKEN_TIME,
  DAEMON_SERVER,
  SERVER_PREFIX,
} from "/config"
import { SCRIPT_HACK } from "/constants"
import { getGrowThreads, getHackThreads, getWeakenThreads } from "/lib/calc-threads-formulas"
import getThreadsAvailable from "/lib/func/get-threads-available"
import { ServerSnapshot } from "/lib/objects"
import Script from "/lib/Script"
import { sum } from "/lib/util"

export default class ServerWrapper {
  private readonly ns: NS
  readonly hostname: string

  readonly moneyMax: number
  readonly moneyAfterHack: number
  readonly serverGrowth: number
  readonly maxRam: number

  readonly minDifficulty: number
  readonly baseDifficulty: number
  readonly requiredHackingSkill: number

  readonly numOpenPortsRequired: number

  private backdoor: boolean
  private root: boolean
  private readonly purchasedByPlayer: boolean

  constructor(ns: NS, hostname: string) {
    this.ns = ns
    this.hostname = hostname

    const server = ns.getServer(hostname)

    // Static values
    this.moneyMax = server.moneyMax
    this.moneyAfterHack = this.moneyMax * (1 - PERCENTAGE_TO_HACK)
    this.serverGrowth = server.serverGrowth
    this.maxRam = server.maxRam

    this.minDifficulty = server.minDifficulty
    this.baseDifficulty = server.baseDifficulty
    this.requiredHackingSkill = server.requiredHackingSkill

    this.numOpenPortsRequired = server.numOpenPortsRequired

    this.root = server.hasAdminRights
    this.backdoor = server.backdoorInstalled
    this.purchasedByPlayer = server.purchasedByPlayer
  }

  getOpenPortCount(): number {
    return this.getServer().openPortCount
  }

  getServer(): Server {
    return this.ns.getServer(this.hostname)
  }

  /**
   * Return a modified server object that has the values set to what they would be if prepped
   */
  getPreppedServer(overrides: Partial<Server> = {}): Server {
    const server = this.getServer()

    return {
      ...server,

      hackDifficulty: server.minDifficulty,
      moneyAvailable: server.moneyMax,

      ...overrides,
    }
  }

  isDraining(): boolean {
    return false // TODO
  }

  isDrained(): boolean {
    return this.getProcesses().length === 0
  }

  async waitTillDrained(): Promise<void> {
    while (!this.isDrained()) {
      await this.ns.asleep(1000)
    }
  }

  drain(): void {
    // TODO
  }

  isRooted(): boolean {
    return this.root ? true : (this.root = this.ns.hasRootAccess(this.hostname))
  }

  isBackdoored(): boolean {
    return this.backdoor ? true : (this.backdoor = this.getServer().backdoorInstalled)
  }

  isPrepped(): boolean {
    return this.isRooted() && this.hasMaxMoney() && this.hasMinSecurity()
  }

  isSetup(): boolean {
    return this.ns.fileExists(SCRIPT_HACK) && this.isRooted()
  }

  isTargetable(): boolean {
    return this.moneyMax > 0
  }

  hasScript(filename: string): boolean {
    return this.ns.fileExists(filename, this.hostname)
  }

  hasMaxMoney(): boolean {
    return this.getMoneyAvailable() >= this.moneyMax * (1 - MONEY_WIGGLE)
  }

  hasMinSecurity(): boolean {
    return this.getSecurityLevel() <= this.minDifficulty * (1 + SECURITY_WIGGLE)
  }

  getRamUsed(): number {
    return this.ns.getServerUsedRam(this.hostname)
  }

  /**
   * Get ram used by non command scripts, aka anything not starting with cmd-
   */
  getNonCommandRamUsed(): number {
    return sum(
      this.getProcesses()
        .filter((p) => !p.filename.startsWith("cmd-")) // Filter out command scripts
        .map((p) => this.ns.getScriptRam(p.filename, this.hostname) * p.threads), // Calculate ram usage of other scripts
    )
  }

  getMoneyAvailable(): number {
    return this.ns.getServerMoneyAvailable(this.hostname)
  }

  getProcesses(): Array<ProcessInfo> {
    return this.ns.ps(this.hostname)
  }

  getSecurityLevel(): number {
    return this.ns.getServerSecurityLevel(this.hostname)
  }

  getProfitPerSecond(): number {
    const player = this.ns.getPlayer()
    const server = this.getPreppedServer()
    const hackSecurityIncrease = this.ns.hackAnalyzeSecurity(this.getHackThreads())
    const growSecurityIncrease = this.ns.growthAnalyzeSecurity(this.getGrowThreads())

    const totalTime =
      this.getHackTime() +
      this.ns.formulas.hacking.weakenTime(
        this.getPreppedServer({ hackDifficulty: server.minDifficulty + hackSecurityIncrease }),
        player,
      ) +
      this.getGrowTime() +
      this.ns.formulas.hacking.weakenTime(
        this.getPreppedServer({ hackDifficulty: server.minDifficulty + growSecurityIncrease }),
        player,
      )

    return (this.moneyMax * PERCENTAGE_TO_HACK) / (totalTime / 1000)
  }

  //////////////////////////////////////////////
  //                TIME STUFF                //
  //////////////////////////////////////////////

  getWeakenTime(prepped = true, additionalSec = 0): number {
    const server = prepped ? this.getPreppedServer() : this.getServer()
    const player = this.ns.getPlayer()

    return this.ns.formulas.hacking.weakenTime(
      { ...server, hackDifficulty: server.hackDifficulty + additionalSec },
      player,
    )
  }

  getGrowTime(prepped = true): number {
    const server = prepped ? this.getPreppedServer({ moneyAvailable: this.moneyAfterHack }) : this.getServer()
    const player = this.ns.getPlayer()

    return this.ns.formulas.hacking.growTime(server, player)
  }

  getHackTime(prepped = true): number {
    const server = prepped ? this.getPreppedServer() : this.getServer()
    const player = this.ns.getPlayer()

    return this.ns.formulas.hacking.hackTime(server, player)
  }

  getMaxTimeRequired(prepped = true): number {
    return this.getWeakenTime(prepped)
  }

  //////////////////////////////////////////////
  //               THREAD STUFF               //
  //////////////////////////////////////////////

  getInitialWeakenThreads(): number {
    return this.getWeakenThreads(false)
  }

  getWeakenThreads(prepped = true, additionalSec = 0): number {
    const server = prepped ? this.getPreppedServer() : this.getServer()

    return getWeakenThreads(server, additionalSec)
  }

  getInitialGrowThreads(): number {
    if (this.moneyMax === 0) {
      return 0
    }

    if (this.getMoneyAvailable() === this.moneyMax) {
      return 0
    }

    return this.getGrowThreads(false)
  }

  getGrowThreads(prepped = true): number {
    const server = prepped ? this.getPreppedServer({ moneyAvailable: this.moneyAfterHack }) : this.getServer()
    const player = this.ns.getPlayer()

    return getGrowThreads(this.ns, server, player)
  }

  getHackThreads(prepped = true): number {
    const server = prepped ? this.getPreppedServer() : this.getServer()
    const player = this.ns.getPlayer()

    return getHackThreads(this.ns, server, player, PERCENTAGE_TO_HACK)
  }

  getBatchThreads(): number {
    return getBatch(this.ns, this.getServer(), this.ns.getPlayer()).threads
  }

  getMaxThreadsRequired(): number {
    return Math.max(
      this.getInitialGrowThreads(),
      this.getWeakenThreads(),
      this.getInitialWeakenThreads(),
      this.getGrowThreads(),
    )
  }

  isRecommendedTarget(): { recommended: boolean; rejectReason: string } {
    const threadsAvail = getThreadsAvailable(this.ns, Script.fromFile(this.ns, SCRIPT_HACK))
    if (!this.isRooted()) {
      return {
        recommended: false,
        rejectReason: "Server not rooted",
      }
    }

    if (this.purchasedByPlayer) {
      return {
        recommended: false,
        rejectReason: "Server purchased by player",
      }
    }

    if (this.moneyMax < 1_500_000) {
      return {
        recommended: false,
        rejectReason: `Server has max money of ${this.moneyMax} below threshold of ${HACK_MIN_MONEY}`,
      }
    }

    const hackSkill = this.ns.getPlayer().skills.hacking
    if (this.requiredHackingSkill > hackSkill) {
      return {
        recommended: false,
        rejectReason: `Server requires ${this.requiredHackingSkill} hacking but player only has ${hackSkill}`,
      }
    }

    if (this.getMaxTimeRequired(false) > TARGET_MAX_PREP_WEAKEN_TIME) {
      return {
        recommended: false,
        rejectReason: `Time of ${Math.round(this.getMaxTimeRequired(false) / 1000)} exceeds threshold of ${Math.round(
          TARGET_MAX_PREP_WEAKEN_TIME / 1000,
        )}`,
      }
    }

    if (this.getMaxThreadsRequired() > threadsAvail) {
      return {
        recommended: false,
        rejectReason: `Thread requirement of ${this.getMaxThreadsRequired()} exceeds threshold of ${threadsAvail}`,
      }
    }

    return { recommended: true, rejectReason: "" }
  }

  getSnapshot(): ServerSnapshot {
    const recommended = this.isRecommendedTarget()
    return {
      hostname: this.hostname,

      moneyAvailable: this.getMoneyAvailable(),
      moneyMax: this.moneyMax,
      profitPerSecond: this.getProfitPerSecond(),

      serverGrowth: this.serverGrowth,

      maxRam: this.maxRam,
      usedRam: this.getRamUsed(),

      minDifficulty: this.minDifficulty,
      baseDifficulty: this.baseDifficulty,
      hackDifficulty: this.getSecurityLevel(),
      requiredHackingSkill: this.requiredHackingSkill,

      weakenTime: this.getWeakenTime(),
      hackTime: this.getHackTime(),
      growTime: this.getGrowTime(),

      backdoor: this.isBackdoored(),
      root: this.isRooted(),
      purchasedByPlayer: this.purchasedByPlayer,

      prepped: this.isPrepped(),
      draining: this.isDraining(),
      setup: this.isSetup(),

      recommended: recommended.recommended,
      rejectReason: recommended.recommended ? "" : recommended.rejectReason,
    }
  }

  static fromServer(ns: NS, target: Server): ServerWrapper {
    return new ServerWrapper(ns, target.hostname)
  }

  // Lower number means should be used first
  getPriority(): number {
    if (this.hostname === "home" || this.hostname === DAEMON_SERVER) {
      return 99
    }

    if (this.hostname.startsWith("hacknet-node-")) {
      return 50
    }

    if (this.hostname.startsWith(SERVER_PREFIX)) {
      return 0
    }

    return 20
  }
}
