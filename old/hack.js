/**
* @param {NS} ns
**/
export async function main(ns) {
  const target = ns.args[0];
  const threads = parseInt(ns.args[1]);
  const maxMoney = parseFloat(ns.args[2]);
  const minSecurity = parseFloat(ns.args[3]);

  const difficultyThreshold = minSecurity + 3;
  const moneyThreshold = maxMoney / 2;

  while (true) {
    const secLevel = await ns.getServerSecurityLevel(target);
    const money = await ns.getServerMoneyAvailable(target);
    ns.print(
      "[" + target + "] "
      + "difficulty: " + secLevel + " (Threshold: " + difficultyThreshold + ") "
      + "money: " + money + " (Threshold: " + moneyThreshold + ")"
    );

    if (secLevel > difficultyThreshold) {
      await ns.weaken(target, { threads });
      continue
    }

    if (money < moneyThreshold) {
      await ns.grow(target, { threads });
      continue
    }

    const res = await ns.hack(target, { threads });
    ns.print("[" + target + "] hack " + ((res > 0) ? "successful, gained: " + res : "failed"));
  }
}