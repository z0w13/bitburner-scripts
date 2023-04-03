import type { NS } from "@ns"
import RingBuffer from "@/lib/RingBuffer"
import { sum } from "@/lib/util"

// Things to spend money on
// - Buying augments
// - Buying sleeve augments
// - Starting a corp
// - Buying gang gear
// - Upgrading/buying hacknet nodes
// - Donating to factions
// - Traveling
// - Programs
// - Servers
// - Home RAM/cores
// - Training

// Wanted Features
// - Prioritising certain things over others, augs should come first for example
// - Money/second to decide whether we should wait before buying something

class MoneyTracker {
  private moneyHistory: RingBuffer<number>

  public constructor() {
    this.moneyHistory = new RingBuffer<number>(120)
  }

  public getMoneyPerMin(): number {
    return this.getMoneyPerSecond() * 60
  }

  public getMoneyPerSecond(): number {
    return sum(this.moneyHistory.getNonEmpty()) / this.moneyHistory.length
  }

  public track(ns: NS): void {
    this.moneyHistory.push(ns.getPlayer().money)
  }
}

export class MoneySpender {
  private moneyTracker: MoneyTracker

  public constructor() {
    this.moneyTracker = new MoneyTracker()
  }

  public tick(ns: NS, tickNum: number): void {
    // Assuming 10 ticks/second this is once per second
    if (tickNum % 10 === 0) {
      this.moneyTracker.track(ns)
    }
  }
}
