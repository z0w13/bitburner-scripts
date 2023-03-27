import type { NS } from "@ns"
import { ansiRegex } from "/lib/term"

type TableRow = Array<unknown>
type TableData = Array<Array<string>>
export type RawTableData = Array<Array<unknown>>

export default function renderTable(rawData: RawTableData, headers = true, footers = false): string {
  let data = normalizeRows(rawData)
  const colLengths = getColumnLengths(data)
  data = normalizeRowLengths(data, colLengths)

  let result = ""
  result += buildDivider(colLengths) + "\n"
  for (const rowIdx in data) {
    if (parseInt(rowIdx) === data.length - 1 && footers) {
      result += buildDivider(colLengths) + "\n"
    }

    result += renderRow(data[rowIdx], colLengths) + "\n"

    if (parseInt(rowIdx) === 0 && headers) {
      result += buildDivider(colLengths) + "\n"
    }
  }
  result += buildDivider(colLengths)
  return result
}

function renderRow(columns: Array<string>, colLengths: Array<number>): string {
  let rowString = ""
  for (const colIdx in columns) {
    rowString += renderColumn(columns[colIdx], colLengths[colIdx])
  }
  rowString += "|" // Closing Divider

  return rowString
}

function renderColumn(content: string, length: number): string {
  return [
    "| ", // Divider
    " ".repeat(length - realColumnLength(content)), // Alignment padding
    content, // Content
    " ", // Padding
  ].join("")
}

function normalizeRows(rawData: RawTableData): TableData {
  const data: TableData = []
  for (const rowIdx in rawData) {
    data.push(rawData[rowIdx].map((v: unknown): string => (typeof v !== "string" ? String(v) : v)))
  }

  return data
}

function normalizeRowLengths(data: TableData, colLengths: Array<number>): TableData {
  const colCount = colLengths.length

  for (const row of data) {
    while (row.length < colCount) {
      row.push("")
    }
  }

  return data
}

function buildDivider(colLengths: Array<number>) {
  let result = ""
  for (const colLength of colLengths) {
    result += "+-" + "-".repeat(colLength) + "-"
  }
  return result + "+"
}

function buildRowFormatString(row: TableRow, colLengths: Array<number>): string {
  let formatString = ""
  for (const colIdx in row) {
    formatString += "| %" + colLengths[colIdx] + "s "
  }
  return formatString + "|"
}

function realColumnLength(col: string): number {
  return col.replaceAll(ansiRegex(), "").length
}

function getColumnLengths(data: TableData): Array<number> {
  const longestRow = Math.max(...data.map((row) => row?.length ?? 0))
  const colLengths = new Array<number>(longestRow).fill(0)

  for (const row of data) {
    for (const colIdx in row) {
      const colLength = realColumnLength(row[colIdx])
      if (colLength > colLengths[colIdx]) {
        colLengths[colIdx] = colLength
      }
    }
  }

  return colLengths
}
