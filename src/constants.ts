export const STATIC_DATA = "/data/static.txt"

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

// From https://github.com/danielyxie/bitburner/blob/a8bef50ef519f34e4387f5826e4b8f3998a764bb/src/utils/WorkType.ts
export enum CrimeType {
  None = "",
  SHOPLIFT = "SHOPLIFT", //"shoplift",
  ROB_STORE = "ROBSTORE", //"rob a store",
  MUG = "MUG", //"mug someone",
  LARCENY = "LARCENY", //"commit larceny",
  DRUGS = "DRUGS", //"deal drugs",
  BOND_FORGERY = "BONDFORGERY", //"forge corporate bonds",
  TRAFFIC_ARMS = "TRAFFICKARMS", //"traffick illegal arms",
  HOMICIDE = "HOMICIDE", //"commit homicide",
  GRAND_THEFT_AUTO = "GRANDTHEFTAUTO", //"commit grand theft auto",
  KIDNAP = "KIDNAP", //"kidnap someone for ransom",
  ASSASSINATION = "ASSASSINATION", //"assassinate a high-profile target",
  HEIST = "HEIST", //"pull off the ultimate heist",
}
