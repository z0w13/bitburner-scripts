import { NS } from "@ns"
import { Attribute, LogLevel } from "/lib/objects"
import BaseAction from "/PlayerManager/Actions/BaseAction"
import TrainAction from "/PlayerManager/Actions/TrainAction"
import WorkForFactionAction from "/PlayerManager/Actions/WorkForFaction"
import AcceptFactionInvitationsAction from "/PlayerManager/Actions/AcceptFactionInvitationAction"
import MakeMoneyAction from "/PlayerManager/Actions/MakeMoneyAction"
import BuyAugmentAction from "/PlayerManager/Actions/BuyAugmentAction"
import BuyUpgradesAction from "/PlayerManager/Actions/BuyUpgradesAction"
import InstallAugmentsAction from "/PlayerManager/Actions/InstallAugmentsAction"
import ReduceKarmaAction from "/PlayerManager/Actions/ReduceKarmaAction"
// import CreateGangAction from "/PlayerManager/Actions/CreateGangAction"
// import CreateCorpAction from "/PlayerManager/Actions/CreateCorpAction"
import TravelForFactionAction from "/PlayerManager/Actions/TravelForFactionAction"
import BackdoorServersAction from "/PlayerManager/Actions/BackdoorServersAction"
import DonateToFactionAction from "/PlayerManager/Actions/DonateToFactionAction"
import UpgradeHacknetAction from "/PlayerManager/Actions/UpgradeHacknetAction"
import { PlayerSettings } from "/lib/shared/GlobalStateManager"
import SpendHashesAction from "/PlayerManager/Actions/SpendHashesAction"
import Logger from "/lib/Logger"
import { LOG_LEVEL } from "/config"
import ManageSleevesAction from "/PlayerManager/Actions/ManageSleevesAction"
import BuySleeveAugmentsAction from "/PlayerManager/Actions/BuySleeveAugmentsAction"
import { BuyServerAction } from "/PlayerManager/Actions/BuyServerAction"

export class PlayerManager {
  protected minLevel: number
  protected passiveOnly: boolean
  protected actions: Array<BaseAction>

  constructor(ns: NS, settings: PlayerSettings) {
    this.minLevel = 10
    this.passiveOnly = settings.passiveOnly
    this.actions = [
      settings.autoReset ? new InstallAugmentsAction() : null,
      new BackdoorServersAction(),

      // settings.createGang ? new CreateGangAction("ZGang") : null,
      // settings.createCorp ? new CreateCorpAction("ZCorp") : null,

      new AcceptFactionInvitationsAction(),
      settings.enableHacknet ? new SpendHashesAction() : null,
      new BuySleeveAugmentsAction(),
      new ManageSleevesAction(),
      new BuyUpgradesAction(),
      new TravelForFactionAction(),
      new BuyAugmentAction(settings.focusHacking),
      new BuyServerAction(ns, false, 8),
      settings.enableHacknet ? new UpgradeHacknetAction() : null,

      new DonateToFactionAction(settings.focusHacking),
      new WorkForFactionAction(settings.focusHacking),

      new TrainAction(Attribute.HACKING, this.minLevel),

      !settings.focusHacking ? new TrainAction(Attribute.STRENGTH, this.minLevel) : null,
      !settings.focusHacking ? new TrainAction(Attribute.DEFENSE, this.minLevel) : null,
      !settings.focusHacking ? new TrainAction(Attribute.DEXTERITY, this.minLevel) : null,
      !settings.focusHacking ? new TrainAction(Attribute.AGILITY, this.minLevel) : null,
      !settings.focusHacking ? new TrainAction(Attribute.CHARISMA, this.minLevel) : null,

      settings.createGang ? new ReduceKarmaAction() : null,
      new MakeMoneyAction(),
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
    const log = new Logger(ns, LOG_LEVEL, "PlayerManager")

    // Run background actions first
    for (const action of this.actions.filter((a) => a.isBackground())) {
      log.debug(
        "%s shouldPerform=%t isBackground=%t",
        action.toString(),
        action.shouldPerform(ns),
        action.isBackground(),
      )

      if (!action.shouldPerform(ns)) {
        continue
      }

      const res = await action.perform(ns)
      log.info("%s result=%t background=%t", action.toString(), res, action.isBackground())
    }

    if (this.passiveOnly) {
      return
    }

    // Run non-background actions
    for (const action of this.actions.filter((a) => !a.isBackground())) {
      log.debug(
        "%s shouldPerform=%t isPerforming=%t isBackground=%t",
        action.toString(),
        action.shouldPerform(ns),
        action.isPerforming(ns),
        action.isBackground(),
      )

      if (action.shouldPerform(ns)) {
        if (!action.isPerforming(ns)) {
          ns.singularity.stopAction()

          const res = await action.perform(ns)
          log.info("%s result=%t background=%t", action.toString(), res, action.isBackground())
        }

        break
      }
    }
  }
}
