import { NS } from "@ns"
import { PERCENTAGE_TO_HACK, HACK_MIN_MONEY, TARGET_TIME_THRESHOLD } from "/config"
import { SCRIPT_HACK } from "/constants"
import getThreadsAvailable from "/lib/get-threads-available"

export default class ServerWrapper {
  ns: NS
  hostname: string

  moneyMax: number
  serverGrowth: number
  maxRam: number

  minDifficulty: number
  baseDifficulty: number
  requiredHackingSkill: number

  backdoor: boolean
  root: boolean
  purchasedByPlayer: boolean

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

  isRooted(): boolean {
    return this.root ? true : (this.root = this.ns.hasRootAccess(this.hostname))
  }

  isBackdoored(): boolean {
    return this.backdoor ? true : (this.backdoor = this.ns.getServer(this.hostname).backdoorInstalled)
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
    return this.moneyMax == this.getMoneyAvailable()
  }

  hasMinSecurity(): boolean {
    return this.minDifficulty == this.getHackDifficulty()
  }

  getRamUsed(): number {
    return this.ns.getServerUsedRam(this.hostname)
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

  getInitialGrowThreads(): number {
    if (this.ns.getServerMoneyAvailable(this.hostname) === this.moneyMax) {
      return 0
    }
    return Math.ceil(
      this.ns.growthAnalyze(this.hostname, this.moneyMax / this.ns.getServerMoneyAvailable(this.hostname)),
    )
  }

  getGrowTime(): number {
    return this.ns.getGrowTime(this.hostname)
  }

  getGrowThreads(initialMoney?: number): number {
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

  getMaxTimeRequired(): number {
    return Math.max(this.getHackTime(), this.getWeakenTime(), this.getGrowTime())
  }

  isRecommendedTarget(): { recommended: boolean; rejectReason: string } {
    const threadsAvail = getThreadsAvailable(this.ns, SCRIPT_HACK)
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

    if (this.getMaxTimeRequired() > TARGET_TIME_THRESHOLD) {
      return {
        recommended: false,
        rejectReason: `Time of ${Math.round(this.getMaxTimeRequired() / 1000)} exceeds threshold of ${
          TARGET_TIME_THRESHOLD / 1000
        }`,
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
}
