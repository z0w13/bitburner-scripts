/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("scan");
  
  const seenHosts = await scanHost(ns, {}, [], "home");

  for (const host in seenHosts) {
    ns.print(host, " ", seenHosts[host]);
  }
}

/** 
 * @param {NS} ns 
 * @param {Object} seenHosts
 * @param []string chain
 * @param string host
 **/
async function scanHost(ns, seenHosts = {}, chain, targetHost) {
  seenHosts[targetHost] = chain

  const foundHosts = ns.scan(targetHost);
  for (const host of foundHosts) {
    if (!seenHosts[host]) {
      ns.print(host, " ", chain);
      await scanHost(ns, seenHosts, chain.concat([targetHost]), host) ;
    }
  }

  return seenHosts;
}