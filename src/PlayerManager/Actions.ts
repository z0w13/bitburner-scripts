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
import TravelForFactionAction from "/PlayerManager/Actions/TravelForFactionAction"
import BackdoorServersAction from "/PlayerManager/Actions/BackdoorServersAction"
import DonateToFactionAction from "/PlayerManager/Actions/DonateToFactionAction"
import UpgradeHacknetAction from "/PlayerManager/Actions/UpgradeHacknetAction"
import { PlayerSettings } from "/lib/StateManager"
import CreateCorpAction from "/PlayerManager/Actions/CreateCorpAction"

export class ActionResolver {
  protected minLevel: number
  protected actions: Array<BaseAction>

  constructor(settings: PlayerSettings) {
    this.minLevel = 10
    this.actions = [
      new BackdoorServersAction(),

      new AcceptFactionInvitationsAction(),
      new BuyUpgradesAction(),
      new TravelForFactionAction(),
      new UpgradeAugmentAction(settings.focusHacking),

      new DonateToFactionAction(settings.focusHacking),
      new WorkForFactionAction(settings.focusHacking),

      new TrainAction(Attribute.HACKING, this.minLevel),
    ]

    if (settings.autoReset) {
      this.addAction(new InstallAugmentsAction(settings.focusHacking), "BackdoorServersAction")
    }

    if (settings.enableHacknet) {
      this.addAction(new UpgradeHacknetAction(), "DonateToFactionAction")
    }

    if (!settings.focusHacking) {
      this.addAction(new TrainAction(Attribute.STRENGTH, 10))
      this.addAction(new TrainAction(Attribute.DEFENSE, 10))
      this.addAction(new TrainAction(Attribute.DEXTERITY, 10))
      this.addAction(new TrainAction(Attribute.AGILITY, 10))
      this.addAction(new TrainAction(Attribute.CHARISMA, 10))
    }

    if (settings.createGang) {
      this.addAction(new CreateGangAction("ZGang"), "AcceptFactionInvitationsAction")
      this.addAction(new ReduceKarmaAction())
    }

    if (settings.createCorp) {
      this.addAction(new CreateCorpAction("ZCorp"), "AcceptFactionInvitationsAction")
    }

    this.addAction(new MakeMoneyAction())
    this.addAction(new IdleAction())
  }

  addAction(action: BaseAction, before?: string) {
    if (before) {
      const beforeIdx = this.actions.findIndex((a) => a.constructor.name === before)
      if (!beforeIdx) {
        throw new Error(`Action ${before} not found`)
      }
      this.actions.splice(beforeIdx - 1, 0, action)
    } else {
      this.actions.push(action)
    }
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
    return this.actions.find((a) => a.shouldPerform(ns)) ?? new IdleAction()
  }
}
