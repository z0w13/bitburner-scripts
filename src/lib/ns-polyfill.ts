import { NS } from '@ns'

export default function setup(ns: NS): void {
  if (!Object.prototype.hasOwnProperty.call(ns, "printf")) {
    ns.printf = function(format: string, ...args: unknown[]) {
      ns.print(ns.sprintf(format, ...args));
    }
  }
}