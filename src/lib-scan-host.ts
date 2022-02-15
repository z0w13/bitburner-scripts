import { NS } from '@ns'

export default function scanHost(ns: NS, seenHosts: Record<string, Array<string>> = {}, chain: Array<string> = [], targetHost = "home"): Record<string, Array<string>> {
  seenHosts[targetHost] = chain

  const foundHosts = ns.scan(targetHost);
  for (const host of foundHosts) {
    if (!seenHosts[host]) {
      scanHost(ns, seenHosts, chain.concat([targetHost]), host);
    }
  }

  return seenHosts;
}
