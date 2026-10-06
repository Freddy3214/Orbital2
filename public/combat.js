import { FLEET, DEFENSE } from "./units.js";

const count = value => Math.max(0, Math.floor(Number(value) || 0));

export function simulateBattle({ attackerFleet = {}, defenderFleet = {}, defenses = {}, attackerAvionics = 0, defenderAvionics = 0, commandCenter = 0, shipyard = 0 }) {
  const fleet = Object.fromEntries(Object.keys(FLEET).map(key => [key, count(attackerFleet[key])]));
  const attackPower = Math.floor(Object.entries(FLEET).reduce((sum, [key, item]) => sum + fleet[key] * item.power, 0) * (1 + count(attackerAvionics) * .08));
  const base = Object.entries(FLEET).reduce((sum, [key, item]) => sum + count(defenderFleet[key]) * item.power, 0)
    + Object.entries(DEFENSE).reduce((sum, [key, item]) => sum + count(defenses[key]) * item.power, 0)
    + count(commandCenter) * 10 + count(shipyard) * 6;
  const defensePower = Math.max(25, Math.floor(base * (1 + count(defenderAvionics) * .05)));
  const won = attackPower >= defensePower;
  const survivors = Object.fromEntries(Object.keys(FLEET).map(key => [key, won ? Math.ceil(fleet[key] * .88) : Math.floor(fleet[key] * .25)]));
  const losses = Object.fromEntries(Object.keys(FLEET).map(key => [key, fleet[key] - survivors[key]]));
  const defenderShipLosses = Object.fromEntries(Object.keys(FLEET).map(key => [key, won ? Math.ceil(count(defenderFleet[key]) * .35) : Math.floor(count(defenderFleet[key]) * .1)]));
  const defenseLosses = Object.fromEntries(Object.keys(DEFENSE).map(key => [key, won ? Math.ceil(count(defenses[key]) * .25) : 0]));
  const capacity = Object.entries(FLEET).reduce((sum, [key, item]) => sum + survivors[key] * item.cargo, 0);
  return { won, attackPower, defensePower, survivors, losses, defenderShipLosses, defenseLosses, capacity };
}
