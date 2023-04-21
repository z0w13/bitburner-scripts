export const MONEY_RESERVE = 35_000_000 // Keep 35 mill in bank
export const RECENT_STOCK_HISTORY_SIZE = 30 // Ticks considered "recent"
export const STOCK_HISTORY_SIZE = 151 // Amount of history to keep
export const TREND_HISTORY_DISPLAY_SIZE = RECENT_STOCK_HISTORY_SIZE // How much history to show in trend

export const MIN_VAL_FOR_STOCK_ORDER = 2_000_000
export const MAX_FUNDS_SPEND_PER_STOCK = 0.2 // Maximum amount of available funds to spend on one stock

export const INVERSION_AGREEMENT_THRESHOLD = 6 // Consider an inversion to have occured after 6 ticks
export const INVERSION_TREND_DIFF_THRESHOLD = 0.2 // 15% difference in trend means possible inversion

export const MIN_STOCK_HOLD_TICKS = 5 // How many ticks we at least hold onto stock for
