import numeral from "numeral"

export function ramFormat(ram: number): string {
  return numeral(ram).format("0.00") + "GiB"
}
