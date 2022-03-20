import { LogLevel } from "/lib/objects"

export const DAEMON_SERVER = "home" // Server to run daemon, etc. on

export const SERVER_PREFIX = "zserv-" // Prefix for when we buy servers
export const DEPRIORITIZE_HOME = true // Schedule jobs on home last

export const PERCENTAGE_TO_HACK = 0.75
export const TARGET_MAX_WEAKEN_TIME = 5 * 60 * 1000 // 5 minutes
export const TARGET_MAX_PREP_WEAKEN_TIME = 10 * 60 * 1000 // 5 minutes
export const HACK_MIN_MONEY = 1_500_000 // Minimum money target should have to consider hacking it

export const LOAD_BUY_THRESHOLD = 0.5 // Purchase additional servers if load above this threshold
export const MAX_PREP_LOAD = 0.5 // Use a maximum of 10% of available power to prepare servers
export const MAX_LOAD = 0.9 // Don't exceed 90% of available power in general
export const MAX_SIMULTANEOUS_PREP_JOBS = 10000

export const BATCH_INTERVAL = 300 // Time between batch jobs
export const BATCH_WEAKEN_MULTIPLIER = 1.5 // How much to mutliply weaken threads with to offset player level gain
export const BATCH_GROW_MULTIPLIER = 2.5 // How much to mutliply grow threads with to offset player level gain

export const SECURITY_WIGGLE = 0.05 // Allow security to be % off target security
export const MONEY_WIGGLE = 0.1 // Allow money to be % off target money

export const LOG_LEVEL = LogLevel.Info

// Log levels per logger, will override above log level, keys are logger names, values log level
export const LOG_LEVELS: Record<string, LogLevel> = {}
