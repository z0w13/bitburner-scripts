import { MoneySource, NS } from "@ns"
import renderTable, { RawTableData } from "/lib/func/render-table"
import RingBuffer from "/lib/RingBuffer"
import { sortFunc } from "/lib/util"

interface IncomeTypes {
  income: number
  expenses: number
  profit: number
}

function getMoneySourceAverage(sources: ReadonlyArray<MoneySource>, timeSinceLastAug: number): IncomeTypes {
  if (sources.length === 0) {
    return { income: 0, expenses: 0, profit: 0 }
  }

  const startingValues = sources[0]
  const endingValues = sources.at(-1)

  const startingIncome =
    startingValues.bladeburner +
    startingValues.casino +
    startingValues.codingcontract +
    startingValues.corporation +
    startingValues.crime +
    startingValues.gang +
    startingValues.hacking +
    startingValues.hacknet +
    startingValues.infiltration +
    startingValues.stock +
    startingValues.work

  const startingExpenses =
    startingValues.class +
    startingValues.hacknet_expenses +
    startingValues.hospitalization +
    startingValues.sleeves +
    startingValues.servers +
    startingValues.other +
    startingValues.augmentations

  const minsSinceLastAug = timeSinceLastAug / 1_000 / 60
  const avgIncomePerMinSinceAug = startingIncome / minsSinceLastAug
  const avgProfitPerMinSinceAug = (startingIncome + startingExpenses) / minsSinceLastAug
  const avgExpensesPerMinSinceAug = startingExpenses / minsSinceLastAug

  if (!endingValues || endingValues === startingValues) {
    return { income: avgIncomePerMinSinceAug, expenses: avgExpensesPerMinSinceAug, profit: avgProfitPerMinSinceAug }
  }

  const endingIncome =
    endingValues.bladeburner +
    endingValues.casino +
    endingValues.codingcontract +
    endingValues.corporation +
    endingValues.crime +
    endingValues.gang +
    endingValues.hacking +
    endingValues.hacknet +
    endingValues.infiltration +
    endingValues.stock +
    endingValues.work

  const endingExpenses =
    endingValues.class +
    endingValues.hacknet_expenses +
    endingValues.hospitalization +
    endingValues.sleeves +
    endingValues.servers +
    endingValues.other +
    endingValues.augmentations

  if (endingIncome === startingIncome && endingExpenses === startingExpenses) {
    return { income: avgIncomePerMinSinceAug, expenses: avgExpensesPerMinSinceAug, profit: avgProfitPerMinSinceAug }
  }

  const incomePerMin = (endingIncome - startingIncome) / sources.length
  const expensePerMin = (endingExpenses - startingExpenses) / sources.length
  const profitPerMin = incomePerMin + expensePerMin

  return {
    income: incomePerMin,
    expenses: expensePerMin,
    profit: profitPerMin,
  }
}

function getSortedStats(source: MoneySource): { income: Array<[string, number]>; expense: Array<[string, number]> } {
  const sources = Object.entries(source) as Array<[string, number]>

  const income = sources
    .filter((v) => v[1] > 0)
    .sort(sortFunc((v) => v[1], true))
    .filter((v) => v[0] !== "total")

  const expense = sources
    .filter((v) => v[1] < 0)
    .sort(sortFunc((v) => v[1]))
    .filter((v) => v[0] !== "total")

  return { income, expense }
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("asleep")

  const moneyHistory = new RingBuffer<MoneySource>(10)
  let ticks = 0

  while (true) {
    if (ticks % 60 === 0) {
      moneyHistory.push(ns.getMoneySources().sinceInstall)
    }

    const fmt = (v: number) => ns.formatNumber(v, 2, 999999999999999) + " USD"

    const sourceAvg = getMoneySourceAverage(moneyHistory.getNonEmpty(), ns.getTimeSinceLastAug())
    const summaryTableData: RawTableData = [
      ["Income/Min", fmt(sourceAvg.income)],
      ["Expenses/Min", fmt(sourceAvg.expenses)],
      ["Profit/Min", fmt(sourceAvg.profit)],
    ]

    ns.clearLog()
    ns.print(renderTable(summaryTableData, false))

    const latestStats = moneyHistory.getNonEmpty().at(-1)
    if (latestStats) {
      const sortedStats = getSortedStats(latestStats)
      const longest = Math.max(sortedStats.expense.length, sortedStats.income.length)

      const detailTableData: RawTableData = [["Income", "", "Expenses", ""]]

      for (let i = 0; i < longest; i++) {
        const income = sortedStats.income.at(i) ?? ["", ""]
        const expense = sortedStats.expense.at(i) ?? ["", ""]

        detailTableData.push([
          income[0],
          typeof income[1] === "number" ? fmt(income[1]) : "",
          expense[0],
          typeof expense[1] === "number" ? fmt(expense[1]) : "",
        ])
      }
      ns.print("\n")
      ns.print(renderTable(detailTableData, true))
    }

    ticks++
    await ns.asleep(1000)
  }
}
