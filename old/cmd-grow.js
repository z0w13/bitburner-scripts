/** @param {NS} ns **/
export async function main(ns) {
	await ns.grow(ns.args[0], { threads: parseInt(ns.args[1]) });
}