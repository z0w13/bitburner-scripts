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
//import CreateCorpAction from "/PlayerManager/Actions/CreateCorpAction"

export class ActionResolver {
  protected minLevel: number
  protected actions: Array<BaseAction>

  constructor(hackFocus = false) {
    this.minLevel = 10
    if (hackFocus) {
      this.actions = [
        //new InstallAugmentsAction(hackFocus),
        new BackdoorServersAction(),

        new AcceptFactionInvitationsAction(),
        new BuyUpgradesAction(),
        new TravelForFactionAction(),
        new UpgradeAugmentAction(hackFocus),

        new DonateToFactionAction(hackFocus),
        new WorkForFactionAction(hackFocus),

        new TrainAction(Attribute.HACKING, 10),
        //new MakeMoneyAction(),
      ]
    } else {
      this.actions = [
        //new InstallAugmentsAction(hackFocus),
        new BackdoorServersAction(),

        //new CreateGangAction("ZCrime"),
        //new CreateCorpAction("ZCorp"), // Disabled because it requires 1TB of RAM
        new AcceptFactionInvitationsAction(),
        new BuyUpgradesAction(),
        new TravelForFactionAction(),
        new UpgradeAugmentAction(hackFocus),

        // NOTE(zowie): Disabled for now as we don't have the hash stuff yet plus it's sucky for making money
        //new UpgradeHacknetAction(),

        new DonateToFactionAction(hackFocus),
        new WorkForFactionAction(hackFocus),

        new TrainAction(Attribute.HACKING, 10),
        new TrainAction(Attribute.STRENGTH, 10),
        new TrainAction(Attribute.DEFENSE, 10),
        new TrainAction(Attribute.DEXTERITY, 10),
        new TrainAction(Attribute.AGILITY, 10),
        new TrainAction(Attribute.CHARISMA, 10),

        //new ReduceKarmaAction(),
        //new MakeMoneyAction(),
      ]
    }

    this.actions.push(new IdleAction())
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
