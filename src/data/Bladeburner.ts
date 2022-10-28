import { NS } from "@ns"

function normalizeEnumName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "")
}

function generateEnums(ns: NS) {
  const resultLines = []
  resultLines.push("export enum Contract {")
  for (const name of ns.bladeburner.getContractNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export enum Operation {")
  for (const name of ns.bladeburner.getOperationNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export enum GeneralAction {")
  for (const name of ns.bladeburner.getGeneralActionNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export enum BlackOp {")
  for (const name of ns.bladeburner.getBlackOpNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  resultLines.push("export enum Skill {")
  for (const name of ns.bladeburner.getSkillNames()) {
    resultLines.push(`  "${normalizeEnumName(name)}" = "${name}",`)
  }
  resultLines.push("}")

  ns.tprintf("%s", resultLines.join("\n"))
}

export enum Contract {
  "Tracking" = "Tracking",
  "BountyHunter" = "Bounty Hunter",
  "Retirement" = "Retirement",
}

export enum Operation {
  "Investigation" = "Investigation",
  "UndercoverOperation" = "Undercover Operation",
  "StingOperation" = "Sting Operation",
  "Raid" = "Raid",
  "StealthRetirementOperation" = "Stealth Retirement Operation",
  "Assassination" = "Assassination",
}

export enum GeneralAction {
  "Training" = "Training",
  "FieldAnalysis" = "Field Analysis",
  "Recruitment" = "Recruitment",
  "Diplomacy" = "Diplomacy",
  "HyperbolicRegenerationChamber" = "Hyperbolic Regeneration Chamber",
  "InciteViolence" = "Incite Violence",
}

export enum BlackOp {
  "OperationTyphoon" = "Operation Typhoon",
  "OperationZero" = "Operation Zero",
  "OperationX" = "Operation X",
  "OperationTitan" = "Operation Titan",
  "OperationAres" = "Operation Ares",
  "OperationArchangel" = "Operation Archangel",
  "OperationJuggernaut" = "Operation Juggernaut",
  "OperationRedDragon" = "Operation Red Dragon",
  "OperationK" = "Operation K",
  "OperationDeckard" = "Operation Deckard",
  "OperationTyrell" = "Operation Tyrell",
  "OperationWallace" = "Operation Wallace",
  "OperationShoulderofOrion" = "Operation Shoulder of Orion",
  "OperationHyron" = "Operation Hyron",
  "OperationMorpheus" = "Operation Morpheus",
  "OperationIonStorm" = "Operation Ion Storm",
  "OperationAnnihilus" = "Operation Annihilus",
  "OperationUltron" = "Operation Ultron",
  "OperationCenturion" = "Operation Centurion",
  "OperationVindictus" = "Operation Vindictus",
  "OperationDaedalus" = "Operation Daedalus",
}

export enum Skill {
  "BladesIntuition" = "Blade's Intuition",
  "Cloak" = "Cloak",
  "ShortCircuit" = "Short-Circuit",
  "DigitalObserver" = "Digital Observer",
  "Tracer" = "Tracer",
  "Overclock" = "Overclock",
  "Reaper" = "Reaper",
  "EvasiveSystem" = "Evasive System",
  "Datamancer" = "Datamancer",
  "CybersEdge" = "Cyber's Edge",
  "HandsofMidas" = "Hands of Midas",
  "Hyperdrive" = "Hyperdrive",
}

export enum ActionType {
  Operation = "Operation",
  Contract = "Contract",
  General = "General",
  BlackOp = "BlackOp",
  Idle = "Idle",
}
