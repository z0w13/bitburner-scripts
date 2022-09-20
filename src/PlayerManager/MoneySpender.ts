import { NS } from "@ns"
import { sum } from "/lib/util"

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

class RingBuffer<T> {
  private elems: Array<T>
  private size: number

  public get length(): number {
    return this.elems.length
  }

  public constructor(size: number) {
    this.elems = new Array<T>(size)
    this.size = size
  }

  public push(elem: T) {
    if (this.elems.length >= this.size) {
      this.elems.shift()
    }

    this.elems.push(elem)
  }

  public toArray(): Array<T> {
    return [...this.elems]
  }
}

class MoneyTracker {
  private moneyHistory: RingBuffer<number>

  public constructor() {
    this.moneyHistory = new RingBuffer<number>(120)
  }

  public getMoneyPerMin(): number {
    return this.getMoneyPerSecond() * 60
  }

  public getMoneyPerSecond(): number {
    return sum(this.moneyHistory.toArray()) / this.moneyHistory.length
  }

  public track(ns: NS): void {
    this.moneyHistory.push(ns.getPlayer().money)
  }
}

class MoneySpender {
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
