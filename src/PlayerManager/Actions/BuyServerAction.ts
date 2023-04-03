import type { NS } from "@ns"
import ServerBuyer from "@/lib/ServerBuyer"
import BaseAction from "@/PlayerManager/Actions/BaseAction"

export class BuyServerAction extends BaseAction {
  protected nextStep: boolean
  protected minRam: number
  protected serverBuyer: ServerBuyer

  constructor(ns: NS, nextStep = false, minRam = 8) {
    super()

    this.nextStep = nextStep
    this.minRam = minRam
    this.serverBuyer = new ServerBuyer(ns, minRam)
  }

  shouldPerform(_ns: NS): boolean {
    return !!this.serverBuyer.getServerToBuy(this.nextStep)
  }

  perform(_ns: NS): Promise<boolean> {
    return this.serverBuyer.buy(this.nextStep)
  }

  isBackground(): boolean {
    return true
  }
}
