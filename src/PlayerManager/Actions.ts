import { NS } from "@ns"
import { Attribute } from "/lib/objects"
import BaseAction from "/PlayerManager/Actions/BaseAction"
import TrainAction from "/PlayerManager/Actions/TrainAction"
import WorkForFactionAction from "/PlayerManager/Actions/WorkForFaction"
import IdleAction from "/PlayerManager/Actions/IdleAction"
import AcceptFactionInvitationsAction from "/PlayerManager/Actions/AcceptFactionInvitationAction"
import MakeMoneyAction from "/PlayerManager/Actions/MakeMoneyAction"
import UpgradeAugmentAction from "/PlayerManager/Actions/UpgradeAugmentAction"
import BuyUpgradesAction from "/PlayerManager/Actions/BuyUpgradesAction"
import InstallAugmentsAction from "/PlayerManager/Actions/InstallAugmentsAction"
import ReduceKarmaAction from "/PlayerManager/Actions/ReduceKarmaAction"
import CreateGangAction from "/PlayerManager/Actions/CreateGangAction"
//import CreateCorpAction from "/PlayerManager/Actions/CreateCorpAction"

export class ActionResolver {
  protected minLevel: number

  actions = [
    new InstallAugmentsAction(),

    new CreateGangAction("ZCrime"),
    //new CreateCorpAction("ZCorp"), // Disabled because it requires 1TB of RAM
    new AcceptFactionInvitationsAction(),
    new BuyUpgradesAction(),
    new UpgradeAugmentAction(),

    // NOTE(zowie): Disabled for now as we don't have the hash stuff yet plus it's sucky for making money
    //new UpgradeHacknetAction(),

    new WorkForFactionAction(),

    new TrainAction(Attribute.HACKING, 10),
    new TrainAction(Attribute.STRENGTH, 10),
    new TrainAction(Attribute.DEFENSE, 10),
    new TrainAction(Attribute.DEXTERITY, 10),
    new TrainAction(Attribute.AGILITY, 10),
    new TrainAction(Attribute.CHARISMA, 10),

    new ReduceKarmaAction(),
    new MakeMoneyAction(),
    new IdleAction(),
  ]

  constructor() {
    this.minLevel = 10
  }

  isPerforming(ns: NS): BaseAction | null {
    for (const action of this.actions) {
      if (action.isPerforming(ns)) {
        return action
      }
    }

    return null
  }

  resolve(ns: NS): BaseAction {
    const player = ns.getPlayer()

    while (true) {
      for (const action of this.actions) {
        if (action.shouldPerform(ns)) {
          return action
        }
      }

      this.minLevel += 2

      for (const action of this.actions) {
        if (action instanceof TrainAction) {
          action.setMinLevel(this.minLevel * player[`${action.getAttribute()}_mult`])
        }
      }
    }
  }
}
