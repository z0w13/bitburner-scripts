import { CONSTANTS } from "/game-constants"

export const STATIC_DATA = "/data/static.txt"
export const GLOBAL_STATE_FILE = "/data/global-state.txt"

export const SCRIPT_WEAKEN = "/libexec/cmd-weaken.js"
export const SCRIPT_HACK = "/libexec/cmd-hack.js"
export const SCRIPT_GROW = "/libexec/cmd-grow.js"
export const SCRIPT_WRITE_FILE = "/libexec/cmd-write-file.js"
export const COPY_SCRIPTS = [SCRIPT_WEAKEN, SCRIPT_HACK, SCRIPT_GROW, SCRIPT_WRITE_FILE]

export const SCRIPT_WGWH_LOOP = "wgwh-loop.js"
export const SCRIPT_WGWH_STATUS = "wgwh-status.js"
export const SCRIPT_SERVER_STATUS = "server-status.js"
export const SCRIPT_LIST_TARGETS = "list-targets.js"

// from src/Constants.ts
export const SERVER_WEAKEN_AMOUNT = 0.05

export const CRIMES = [
  CONSTANTS.CrimeShoplift,
  CONSTANTS.CrimeRobStore,
  CONSTANTS.CrimeMug,
  CONSTANTS.CrimeLarceny,
  CONSTANTS.CrimeDrugs,
  CONSTANTS.CrimeBondForgery,
  CONSTANTS.CrimeTraffickArms,
  CONSTANTS.CrimeHomicide,
  CONSTANTS.CrimeGrandTheftAuto,
  CONSTANTS.CrimeKidnap,
  CONSTANTS.CrimeAssassination,
  CONSTANTS.CrimeHeist,
]
