import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
  for (const file of ns.ls("home", ".js")) {
    ns.rm(file)
  }
}