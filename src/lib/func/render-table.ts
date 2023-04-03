import { ansiRegex } from "@/lib/term"

type TableData = Array<Array<string>>
export type RawTableData = Array<Array<unknown>>

export default function renderTable(rawData: RawTableData, headers = true, footers = false): string {
  const tableData = normalizeRowColumns(stringifyTableData(rawData), getTotalColumns(rawData))
  const tableInfo = getTableInfo(tableData)

  let result = ""
  result += buildDivider(tableInfo.columnLengths) + "\n"
  for (const rowIdx in tableData) {
    if (parseInt(rowIdx) === tableData.length - 1 && footers) {
      result += buildDivider(tableInfo.columnLengths) + "\n"
    }

    result += renderRow(tableData[rowIdx], tableInfo.columnLengths) + "\n"

    if (parseInt(rowIdx) === 0 && headers) {
      result += buildDivider(tableInfo.columnLengths) + "\n"
    }
  }
  result += buildDivider(tableInfo.columnLengths)
  return result
}

interface TableInfo {
  columns: number
  columnLengths: Array<number>
  rows: number
}

function getTableInfo(data: TableData): TableInfo {
  const totalColumns = getTotalColumns(data)
  const columnLengths = getColumnLengths(data, totalColumns)

  return {
    columnLengths,
    columns: totalColumns,
    rows: data.length,
  }
}

function getColumnLengths(data: TableData, totalColumns: number): Array<number> {
  const colLengths = new Array<number>(totalColumns).fill(0)

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

function renderRow(cells: Array<string>, columnLengths: Array<number>): string {
  let rowString = ""
  for (const colIdx in cells) {
    rowString += renderCell(cells[colIdx], columnLengths[colIdx])
  }
  rowString += "|" // Closing Divider

  return rowString
}

function renderCell(content: string, length: number): string {
  return [
    "| ", // Divider
    " ".repeat(length - realColumnLength(content)), // Alignment padding
    content, // Content
    " ", // Padding
  ].join("")
}

// Return columns of largest row so we can normalise column count across rows
function getTotalColumns(data: RawTableData): number {
  return Math.max(...data.map((row) => row?.length ?? 0))
}

// Convert all cell values to strings
function stringifyTableData(rawData: RawTableData): TableData {
  return rawData.map((row) => row.map((cell: unknown): string => (typeof cell !== "string" ? String(cell) : cell)))
}

// Make sure all row arrays are equally sized (adding empty cells if needed)
function normalizeRowColumns(data: TableData, columns: number): TableData {
  return data.map((row) => row.fill("", row.length, columns - row.length))
}

function buildDivider(colLengths: Array<number>) {
  let result = ""
  for (const colLength of colLengths) {
    result += "+-" + "-".repeat(colLength) + "-"
  }
  return result + "+"
}

function realColumnLength(col: string): number {
  return col.replaceAll(ansiRegex(), "").length
}
