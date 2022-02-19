import { NS, ProcessInfo, Server } from "@ns"
import {
  PERCENTAGE_TO_HACK,
  HACK_MIN_MONEY,
  TARGET_MAX_WEAKEN_TIME,
  SECURITY_WIGGLE,
  MONEY_WIGGLE,
  TARGET_MAX_PREP_WEAKEN_TIME,
} from "/config"
import { SCRIPT_HACK, SCRIPT_WRITE_FILE } from "/constants"
import { calculateGrowTime, calculateHackingTime, calculateWeakenTime } from "/lib/formulas"
import getThreadsAvailable from "/lib/get-threads-available"
import { ServerSnapshot } from "/lib/objects"
import { sum } from "/lib/util"
import waitForPids from "/lib/wait-for-pids"

export default class ServerWrapper {
  private readonly ns: NS
  readonly hostname: string

  readonly moneyMax: number
  readonly serverGrowth: number
  readonly maxRam: number

  readonly minDifficulty: number
  readonly baseDifficulty: number
  readonly requiredHackingSkill: number

  private backdoor: boolean
  private root: boolean
  private readonly purchasedByPlayer: boolean

  constructor(ns: NS, hostname: string) {
    this.ns = ns
    this.hostname = hostname

    const server = ns.getServer(hostname)

    this.moneyMax = server.moneyMax
    this.serverGrowth = server.serverGrowth
    this.maxRam = server.maxRam

    this.minDifficulty = server.minDifficulty
    this.baseDifficulty = server.baseDifficulty
    this.requiredHackingSkill = server.requiredHackingSkill

    this.root = server.hasAdminRights
    this.backdoor = server.backdoorInstalled
    this.purchasedByPlayer = server.purchasedByPlayer
  }

  getServer(): Server {
    return this.ns.getServer(this.hostname)
  }

  /**
   * Return a modified server object that has the values set to what they would be if prepped
   */
  getPreppedServer(): Server {
    const server = this.getServer()
    return {
      ...server,

      hackDifficulty: server.minDifficulty,
      moneyAvailable: server.moneyMax,
    }
  }

  isDraining(): boolean {
    return this.ns.fileExists("draining.txt", this.hostname)
  }

  isDrained(): boolean {
    return this.getProcesses().length === 0
  }

  async waitTillDrained(): Promise<void> {
    await waitForPids(
      this.ns,
      this.getProcesses().map((p) => p.pid),
    )
  }

  async drain(): Promise<void> {
    if (!this.isDraining()) {
      await waitForPids(this.ns, [this.ns.exec(SCRIPT_WRITE_FILE, this.hostname, 1, ...["--filename", "draining.txt"])])
    }
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

  hasScript(filename: string): boolean {
    return this.ns.fileExists(filename, this.hostname)
  }

  hasMaxMoney(): boolean {
    return this.getMoneyAvailable() >= this.moneyMax * (1 - MONEY_WIGGLE)
  }

  hasMinSecurity(): boolean {
    return this.getHackDifficulty() <= this.minDifficulty * (1 + SECURITY_WIGGLE)
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

  getHackDifficulty(): number {
    return this.ns.getServerSecurityLevel(this.hostname)
  }

  getInitialWeakenThreads(): number {
    return Math.ceil(this.baseDifficulty / this.ns.weakenAnalyze(1, 1))
  }

  getWeakenThreads(additionalDiff = 0): number {
    return Math.ceil((this.getHackDifficulty() - this.minDifficulty + additionalDiff) / this.ns.weakenAnalyze(1, 1))
  }

  getWeakenTime(): number {
    return this.ns.getWeakenTime(this.hostname)
  }

  getProfitPerSecond(): number {
    const player = this.ns.getPlayer()
    const server = this.ns.getServer(this.hostname)
    server.hackDifficulty = server.minDifficulty

    const hackSecurityIncrease = this.ns.hackAnalyzeSecurity(this.getHackThreads())
    const growSecurityIncrease = this.ns.growthAnalyzeSecurity(this.getGrowThreads())

    const totalTime =
      calculateHackingTime(server, player) +
      calculateWeakenTime({ ...server, hackDifficulty: server.minDifficulty + hackSecurityIncrease }, player) +
      calculateGrowTime(server, player) +
      calculateWeakenTime({ ...server, hackDifficulty: server.minDifficulty + growSecurityIncrease }, player)

    return this.moneyMax / totalTime
  }

  getGrowTime(): number {
    return this.ns.getGrowTime(this.hostname)
  }

  getInitialGrowThreads(): number {
    if (this.moneyMax === 0) {
      return 0
    }

    if (this.ns.getServerMoneyAvailable(this.hostname) === this.moneyMax) {
      return 0
    }
    return Math.ceil(
      this.ns.growthAnalyze(this.hostname, this.moneyMax / this.ns.getServerMoneyAvailable(this.hostname)),
    )
  }

  getGrowThreads(initialMoney?: number): number {
    if (this.moneyMax === 0) {
      return 0
    }

    if (initialMoney === undefined) {
      initialMoney = this.moneyMax * (1 - PERCENTAGE_TO_HACK)
    }

    return Math.ceil(this.ns.growthAnalyze(this.hostname, this.moneyMax / initialMoney))
  }

  getMoneyAvailable(): number {
    return this.ns.getServerMoneyAvailable(this.hostname)
  }

  getHackTime(): number {
    return this.ns.getHackTime(this.hostname)
  }

  getHackThreads(): number {
    return Math.floor(this.ns.hackAnalyzeThreads(this.hostname, this.moneyMax * PERCENTAGE_TO_HACK))
  }

  getMaxThreadsRequired(): number {
    return Math.max(
      this.getInitialGrowThreads(),
      this.getWeakenThreads(),
      this.getInitialWeakenThreads(),
      this.getGrowThreads(),
    )
  }

  getProcesses(): Array<ProcessInfo> {
    return this.ns.ps(this.hostname)
  }

  getMaxTimeRequired(): number {
    return this.getWeakenTime()
  }

  isRecommendedTarget(): { recommended: boolean; rejectReason: string } {
    const threadsAvail = getThreadsAvailable(this.ns, { file: SCRIPT_HACK, ram: this.ns.getScriptRam(SCRIPT_HACK) })
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

    if (this.requiredHackingSkill > this.ns.getPlayer().hacking) {
      return {
        recommended: false,
        rejectReason: `Server requires ${this.requiredHackingSkill} hacking but player only has ${
          this.ns.getPlayer().hacking
        }`,
      }
    }

    if (this.getWeakenTime() > TARGET_MAX_PREP_WEAKEN_TIME) {
      return {
        recommended: false,
        rejectReason: `Time of ${Math.round(this.getMaxTimeRequired() / 1000)} exceeds threshold of ${Math.round(
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

  isTargetable(): boolean {
    return this.moneyMax > 0
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
      hackDifficulty: this.getHackDifficulty(),
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
}
