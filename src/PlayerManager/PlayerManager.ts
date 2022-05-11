import { NS } from "@ns"
import { Attribute, LogLevel } from "/lib/objects"
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
import { PlayerSettings } from "/lib/shared/GlobalStateManager"
import SpendHashesAction from "/PlayerManager/Actions/SpendHashesAction"
import Logger from "/lib/Logger"
// import CreateCorpAction from "/PlayerManager/Actions/CreateCorpAction"

export class PlayerManager {
  protected minLevel: number
  protected actions: Array<BaseAction>

  constructor(settings: PlayerSettings) {
    this.minLevel = 10
    this.actions = [
      settings.autoReset ? new InstallAugmentsAction() : null,
      new BackdoorServersAction(),

      // settings.createGang ? new CreateGangAction("ZGang") : null,
      // settings.createCorp ? new CreateCorpAction("ZCorp") : null,

      new AcceptFactionInvitationsAction(),
      settings.enableHacknet ? new SpendHashesAction() : null,
      new BuyUpgradesAction(),
      new TravelForFactionAction(),
      new UpgradeAugmentAction(settings.focusHacking),
      settings.enableHacknet ? new UpgradeHacknetAction() : null,

      new DonateToFactionAction(settings.focusHacking),
      new WorkForFactionAction(settings.focusHacking),

      !settings.passiveOnly ? new TrainAction(Attribute.HACKING, this.minLevel) : null,

      !settings.passiveOnly && !settings.focusHacking ? new TrainAction(Attribute.STRENGTH, this.minLevel) : null,
      !settings.passiveOnly && !settings.focusHacking ? new TrainAction(Attribute.DEFENSE, this.minLevel) : null,
      !settings.passiveOnly && !settings.focusHacking ? new TrainAction(Attribute.DEXTERITY, this.minLevel) : null,
      !settings.passiveOnly && !settings.focusHacking ? new TrainAction(Attribute.AGILITY, this.minLevel) : null,
      !settings.passiveOnly && !settings.focusHacking ? new TrainAction(Attribute.CHARISMA, this.minLevel) : null,

      // settings.createGang && !settings.passiveOnly ? new ReduceKarmaAction() : null,
      // !settings.passiveOnly ? new MakeMoneyAction() : null,
    ].filter((v): v is BaseAction => v !== null)
  }

  isPerforming(ns: NS): BaseAction | null {
    for (const action of this.actions) {
      if (action.isPerforming(ns)) {
        return action
      }
    }

    return null
  }

  async run(ns: NS): Promise<void> {
    const log = new Logger(ns, LogLevel.Info, "PlayerManager")
    for (const action of this.actions) {
      if (!action.shouldPerform(ns)) {
        continue
      }

      if (!action.isPerforming(ns)) {
        if (!action.isBackground()) {
          ns.stopAction()
        }

        const res = await action.perform(ns)
        log.info(
          "%s result=%t continue=%t background=%t",
          action.toString(),
          res,
          action.shouldContinue(),
          action.isBackground(),
        )

        if (!action.shouldContinue()) {
          break
        }
      }
    }
  }
}
