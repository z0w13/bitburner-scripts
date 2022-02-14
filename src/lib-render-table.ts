import { NS } from "@ns"

type TableRow = Array<string>
type TableData = Array<TableRow>;

export default function renderTable(ns: NS, data: TableData, headers = true, footers = false): string {
  const colLengths = getColumnLengths(data);
  data = normalizeRowLenghts(data, colLengths)
  
  let result = "";
  result += buildDivider(colLengths) + "\n";
  for (const rowIdx in data) {

    const row = data[rowIdx];
    if (parseInt(rowIdx) === data.length-1 && footers) {
      result += buildDivider(colLengths) + "\n";
    }

    result += ns.sprintf(buildRowFormatString(row, colLengths), ...row) + "\n";

    if (parseInt(rowIdx) === 0 && headers) {
      result += buildDivider(colLengths) + "\n";
    }
  }
  result += buildDivider(colLengths);
  return result;
}

function normalizeRowLenghts(data: TableData, colLengths: Array<number>): TableData {
  const colCount = colLengths.length

  for (const row of data) {
    while (row.length < colCount) {
      row.push("")
    }
  }

  return data;
}

function buildDivider(colLengths: Array<number>) {
  let result = "";
  for (const colLength of colLengths) {
    result += "+-" + ("-".repeat(colLength)) + "-"
  }
  return result + "+";
}

function buildRowFormatString(row: TableRow, colLengths: Array<number>): string {
  let formatString = "";
  for (const colIdx in row) {
    formatString += "| %" + colLengths[colIdx] + "s ";
  }
  return formatString + "|"
}

function getColumnLengths(data: TableData): Array<number> {

  const longestRow = Math.max(...data.map(row => row.length));
  const colLengths = new Array<number>(longestRow).fill(0);

  for (const row of data) {
    for (const colIdx in row) {
      const col = row[colIdx];
      if (col.length > colLengths[colIdx]) {
        colLengths[colIdx] = col.length;
      }
    }
  }

  return colLengths
}