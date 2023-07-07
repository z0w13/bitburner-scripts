import { FactionJoinRequirementData, FactionJoinRequirements } from "@/data/Factions"
import renderTable, { RawTableData } from "@/lib/func/render-table"
import { formatChangeColor } from "@/lib/term"
import { formatMoney, formatNum } from "@/lib/util"
import { NS } from "@ns"

type FactionJoinRequirementResult = Record<keyof FactionJoinRequirements, boolean>

function factionMetReqs(ns: NS, reqs: FactionJoinRequirements): FactionJoinRequirementResult {
  const res: FactionJoinRequirementResult = {
    backdoor: false,
    augments: false,
    city: false,
    combat: false,
    hacking: false,
    karma: false,
    killed: false,
    megacorp: false,
    money: false,
    enemies: false,
    enemyCorps: false,
  }

  const player = ns.getPlayer()

  if (reqs.backdoor) {
    res.backdoor = ns.getServer(reqs.backdoor).backdoorInstalled ?? false
  }

  if (reqs.augments) {
    res.augments = ns.singularity.getOwnedAugmentations().length >= reqs.augments
  }

  if (reqs.city) {
    res.city = reqs.city.includes(player.city)
  }

  if (reqs.combat) {
    const skills = player.skills
    const lowestCombat = Math.min(skills.agility, skills.defense, skills.dexterity, skills.strength)
    res.combat = lowestCombat >= reqs.combat
  }

  if (reqs.hacking) {
    const minHackLevel = Math.max(
      reqs.backdoor ? ns.getServerRequiredHackingLevel(reqs.backdoor) : 0,
      reqs.hacking ?? 0,
    )
    res.hacking = player.skills.hacking >= minHackLevel
  }

  if (reqs.karma) {
    res.karma = false // TODO
  }

  if (reqs.killed) {
    res.killed = player.numPeopleKilled >= reqs.killed
  }

  if (reqs.megacorp) {
    // TODO: Bonus from backdoored server?
    const corpRep = Object.keys(player.jobs).includes(reqs.megacorp) ? ns.singularity.getCompanyRep(reqs.megacorp) : 0
    res.megacorp = corpRep > 400_000
  }

  if (reqs.money) {
    res.money = player.money >= reqs.money
  }

  if (reqs.enemies) {
    res.enemies = !player.factions.some((f) => reqs.enemies?.includes(f))
  }

  if (reqs.enemyCorps) {
    res.enemyCorps = !Object.keys(player.jobs).some((f) => reqs.enemyCorps?.includes(f))
  }

  return res
}

function renderEnemies(playerFactions: ReadonlyArray<string>, enemies: ReadonlyArray<string>): string {
  return enemies.map((e) => formatChangeColor(!playerFactions.includes(e), e)).join(", ")
}

function renderCity(playerCity: string, city: ReadonlyArray<string>): string {
  return city.map((c) => formatChangeColor(playerCity === c, c)).join(", ")
}

export async function main(ns: NS): Promise<void> {
  const kills = ns.getPlayer().numPeopleKilled
  const money = ns.getPlayer().money
  const augCount = ns.singularity.getOwnedAugmentations().length
  const skills = ns.getPlayer().skills
  const lowestCombat = Math.min(skills.agility, skills.defense, skills.dexterity, skills.strength)
  const factions = new Set<string>(ns.getPlayer().factions)

  const tableData: RawTableData = [
    [
      "Faction",
      "Backdoor",
      "Hack",
      "Combat",
      "Money",
      "Aguments",
      "City",
      "Killed",
      "Enemies",
      "Job",
      "Megacorp & Rep",
      "In",
    ],
  ]

  for (const [name, reqs] of Object.entries(FactionJoinRequirementData)) {
    if (name === "Daedalus") {
      reqs.augments = ns.getBitNodeMultipliers().DaedalusAugsRequirement
    }

    if (reqs.hacking || reqs.backdoor) {
      reqs.hacking = Math.max(reqs.backdoor ? ns.getServerRequiredHackingLevel(reqs.backdoor) : 0, reqs.hacking ?? 0)
    }

    const met = factionMetReqs(ns, reqs)

    tableData.push([
      name,
      reqs.backdoor ? formatChangeColor(ns.getServer(reqs.backdoor).backdoorInstalled ?? false, reqs.backdoor) : "",
      reqs.hacking ? formatChangeColor(skills.hacking, formatNum(ns, reqs.hacking, 0, 100_000), reqs.hacking) : "",
      reqs.combat ? formatChangeColor(lowestCombat, formatNum(ns, reqs.combat, 0, 100_000), reqs.combat) : "",
      reqs.money ? formatChangeColor(money, formatMoney(ns, reqs.money, 0), reqs.money) : "",
      reqs.augments ? formatChangeColor(augCount, reqs.augments, reqs.augments) : "",
      reqs.city ? renderCity(ns.getPlayer().city, reqs.city) : "",
      reqs.killed ? formatChangeColor(kills, reqs.killed, reqs.killed) : "",
      reqs.enemies || reqs.enemyCorps
        ? renderEnemies(
            [...factions, ...Object.keys(ns.getPlayer().jobs)],
            [...(reqs.enemies ?? []), ...(reqs.enemyCorps ?? [])],
          )
        : "",
      reqs.megacorp ? formatChangeColor(met.megacorp, reqs.megacorp) : "",
      formatChangeColor(factions.has(name), factions.has(name) ? "Y" : "N"),
    ])
  }

  ns.tprintf(renderTable(tableData))
}
