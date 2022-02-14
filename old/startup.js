/** @param {NS} ns **/
export async function main(ns) {
	ns.exec("scan-and-run-hack.js", "home");
	ns.exec("status-display.js", "home");
	ns.exec("buy-servers.js", "home");

	ns.tail("scan-and-run-hack.js", "home");
	ns.tail("status-display.js", "home");
	ns.tail("buy-servers.js", "home");
}