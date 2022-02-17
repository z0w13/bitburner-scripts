import { LogLevel } from "/lib/logger"

export const PERCENTAGE_TO_HACK = 0.75
export const TARGET_TIME_THRESHOLD = 5 * 60 * 1000 // 5 minutes
export const HACK_MIN_MONEY = 1_500_000 // Minimum money target should have to consider hacking it

export const MAX_PREP_LOAD = 0.9 // Use a maximum of 10% of available power to prepare servers
export const MAX_LOAD = 0.9 // Don't exceed 90% of available power in general

export const SECURITY_WIGGLE = 0.05 // Allow security to be % off target security
export const MONEY_WIGGLE = 0.05 // Allow money to be % off target money

export const LOG_LEVEL = LogLevel.Debug
