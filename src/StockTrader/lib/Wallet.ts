import { NS } from "@ns"

export interface Wallet {
  getFunds(): number
  update(val: number): void
}

export class PlayerWallet implements Wallet {
  ns: NS

  constructor(ns: NS) {
    this.ns = ns
  }

  getFunds(): number {
    return this.ns.getPlayer().money
  }

  update(_val: number): void {
    // Don't do anything here as we are tracking live money anyway
  }
}

export class MockWallet implements Wallet {
  money: number
  constructor(initial = 0) {
    this.money = initial
  }

  getFunds(): number {
    return this.money
  }

  update(val: number): void {
    this.money = val
  }
}
