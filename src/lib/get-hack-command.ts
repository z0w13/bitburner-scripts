import { NS, Server } from '@ns'
import { Command } from '/lib/objects';
import { SCRIPT_HACK } from '/constants';

export default function getHackCommand(ns: NS, target: Server): Command {
  const hackAmount = target.moneyMax / 2;
  const hackThreads = Math.ceil(ns.hackAnalyzeThreads(target.hostname, hackAmount));
  const hackTime = ns.getHackTime(target.hostname);
  const hackSecurity = ns.hackAnalyzeSecurity(hackThreads);

  return {
    target: target.hostname,
    threads: hackThreads,
    ram: hackThreads * ns.getScriptRam(SCRIPT_HACK),
    time: hackTime,
    security: hackSecurity,
    script: SCRIPT_HACK,
  }
}
