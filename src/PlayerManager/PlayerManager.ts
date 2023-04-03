import type { NS } from "@ns"
import { Attribute, LogLevel } from "@/lib/objects"
import BaseAction from "@/PlayerManager/Actions/BaseAction"
import TrainAction from "@/PlayerManager/Actions/TrainAction"
import WorkForFactionAction from "@/PlayerManager/Actions/WorkForFaction"
import AcceptFactionInvitationsAction from "@/PlayerManager/Actions/AcceptFactionInvitationAction"
import MakeMoneyAction from "@/PlayerManager/Actions/MakeMoneyAction"
import BuyAugmentAction from "@/PlayerManager/Actions/BuyAugmentAction"
import BuyUpgradesAction from "@/PlayerManager/Actions/BuyUpgradesAction"
import InstallAugmentsAction from "@/PlayerManager/Actions/InstallAugmentsAction"
import ReduceKarmaAction from "@/PlayerManager/Actions/ReduceKarmaAction"
// import CreateGangAction from "@/PlayerManager/Actions/CreateGangAction"
// import CreateCorpAction from "@/PlayerManager/Actions/CreateCorpAction"
import TravelForFactionAction from "@/PlayerManager/Actions/TravelForFactionAction"
import BackdoorServersAction from "@/PlayerManager/Actions/BackdoorServersAction"
import DonateToFactionAction from "@/PlayerManager/Actions/DonateToFactionAction"
import UpgradeHacknetAction from "@/PlayerManager/Actions/UpgradeHacknetAction"
import SpendHashesAction from "@/PlayerManager/Actions/SpendHashesAction"
import Logger from "@/lib/Logger"
import { LOG_LEVEL } from "@/config"
import ManageSleevesAction from "@/PlayerManager/Actions/ManageSleevesAction"
import BuySleeveAugmentsAction from "@/PlayerManager/Actions/BuySleeveAugmentsAction"
import { BuyServerAction } from "@/PlayerManager/Actions/BuyServerAction"
import BladeburnerLevelSkillAction from "@/PlayerManager/Actions/BladeburnerLevelSkillAction"
import BladeburnerPerformAction from "@/PlayerManager/Actions/BladeburnerPerformAction"

export class PlayerManager {
  protected passiveOnly: boolean

  protected log: Logger
  protected minLevel: number
  protected ticks: number
  protected actions: Array<BaseAction>

  constructor(ns: NS, logLevel: LogLevel = LOG_LEVEL) {
    const settings = {
      passiveOnly: false,
      autoReset: false,
      enableHacknet: true,
      focusHacking: false,
      createGang: false,
    }
    this.passiveOnly = settings.passiveOnly

    this.log = new Logger(ns, logLevel, "PlayerManager")
    this.minLevel = 10
    this.ticks = 0
    this.actions = [
      settings.autoReset ? new InstallAugmentsAction() : null,
      new BackdoorServersAction(),

      // settings.createGang ? new CreateGangAction("ZGang") : null,
      // settings.createCorp ? new CreateCorpAction("ZCorp") : null,

      new AcceptFactionInvitationsAction(),
      settings.enableHacknet ? new SpendHashesAction() : null,
      new BladeburnerLevelSkillAction(),
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

      new BladeburnerPerformAction(),
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
    this.ticks++

    // Run background actions first
    for (const action of this.actions.filter((a) => a.isBackground(ns))) {
      this.log.debug(
        "%04u %s shouldPerform=%t isBackground=%t",
        this.ticks,
        action.toString(),
        action.shouldPerform(ns),
        action.isBackground(ns),
      )

      if (!action.shouldPerform(ns)) {
        continue
      }

      const res = await action.perform(ns)
      this.log.info("%04u %s result=%t background=%t", this.ticks, action.toString(), res, action.isBackground(ns))
    }

    if (this.passiveOnly) {
      return
    }

    // Run non-background actions
    for (const action of this.actions.filter((a) => !a.isBackground(ns))) {
      this.log.debug(
        "%04u %s shouldPerform=%t isPerforming=%t isBackground=%t",
        this.ticks,
        action.toString(),
        action.shouldPerform(ns),
        action.isPerforming(ns),
        action.isBackground(ns),
      )

      if (action.shouldPerform(ns)) {
        if (!action.isPerforming(ns)) {
          ns.singularity.stopAction()

          const res = await action.perform(ns)
          this.log.info("%04u %s result=%t background=%t", this.ticks, action.toString(), res, action.isBackground(ns))
        }

        break
      }
    }
  }
}
