import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simulateBattle } from "../public/combat.js";

const directory = await mkdtemp(join(tmpdir(), "orbital-flight-"));
process.env.ACCOUNT_FILE = join(directory, "accounts.json");
process.env.PORT = "4797";
delete process.env.DATABASE_URL;
const { server, resolveDuePvpFlights } = await import("../server.mjs");
after(async () => {
  await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive:true, force:true });
});
const base = "http://127.0.0.1:4797";
async function api(path, method = "GET", body, cookie) {
  const response = await fetch(base + path, { method, headers:{ ...(body ? { "Content-Type":"application/json" } : {}), ...(cookie ? { Cookie:cookie } : {}) }, body:body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  assert.ok(response.ok, `${path}: ${response.status} ${payload.error || ""}`);
  return { payload, cookie:response.headers.get("set-cookie")?.split(";")[0] };
}
test("PvP flights warn the defender and settle from arrival-time state", async () => {
  const a = await api("/api/auth/register", "POST", {username:"FlightAlpha",password:"secure1234"});
  const b = await api("/api/auth/register", "POST", {username:"FlightBeta",password:"secure1234"});
  for (const signup of [a, b]) {
    const { state } = signup.payload;
    for (const key of ["metal", "crystal", "tritium"]) {
      assert.equal(state.resources[key], 100_000);
      assert.equal(state.planets[0].resources[key], 100_000);
    }
    assert.equal(state.buildBoostUntil - state.buildBoostFrom, 2 * 60 * 60_000);
    assert.ok(state.buildBoostFrom >= state.createdAt);
  }
  const aCookie = a.cookie, bCookie = b.cookie;
  const attacker = a.payload.state;
  attacker.ships.spyProbe = 5;
  attacker.ships.battleship = 2;
  await api("/api/state", "PUT", {state:attacker}, aCookie);
  const galaxy = (await api("/api/galaxy", "GET", undefined, aCookie)).payload;
  const target = galaxy.contacts.find(contact => contact.owner === "FlightBeta");
  assert.ok(target, "defender visible on galaxy map");

  const spy = (await api("/api/spy", "POST", {targetId:target.id,probes:2}, aCookie)).payload.flight;
  assert.equal(spy.phase, "outgoing");
  assert.ok(spy.arrivesAt - spy.departedAt >= 120000);
  const beforeSpy = (await api("/api/state", "GET", undefined, aCookie)).payload.state;
  assert.equal(beforeSpy.spyReports.length, 0);
  assert.equal(beforeSpy.ships.spyProbe, 3);
  assert.equal((await api("/api/state", "GET", undefined, bCookie)).payload.state.incomingFlights[0].id, spy.id);
  await resolveDuePvpFlights(spy.arrivesAt + 1);
  const afterSpy = (await api("/api/state", "GET", undefined, aCookie)).payload.state;
  assert.equal(afterSpy.spyReports.length, 1);
  assert.equal(afterSpy.pvpFlights[0].phase, "returning");
  const scannedDefender = (await api("/api/state", "GET", undefined, bCookie)).payload.state;
  assert.equal(scannedDefender.incomingFlights.length, 0);
  assert.equal(scannedDefender.spyReports[0].side, "defender");
  await resolveDuePvpFlights(afterSpy.pvpFlights[0].returnAt + 1);
  assert.equal((await api("/api/state", "GET", undefined, aCookie)).payload.state.pvpFlights.length, 0);

  const raid = (await api("/api/raids", "POST", {targetId:target.id,fleet:{battleship:1}}, aCookie)).payload.flight;
  assert.ok(raid.arrivesAt - raid.departedAt >= 240000);
  assert.equal((await api("/api/state", "GET", undefined, bCookie)).payload.state.incomingFlights[0].id, raid.id);
  const defender = (await api("/api/state", "GET", undefined, bCookie)).payload.state;
  for (const key of ["metal","crystal","tritium"]) {
    defender.resources[key] = 0;
    defender.planets.find(planet => planet.id === defender.activePlanetId).resources[key] = 0;
  }
  await api("/api/state", "PUT", {state:defender}, bCookie);
  await resolveDuePvpFlights(raid.arrivesAt + 1);
  const battle = (await api("/api/state", "GET", undefined, aCookie)).payload.state;
  assert.equal(battle.combatReports.length, 1);
  assert.deepEqual(battle.combatReports[0].loot, {metal:0,crystal:0,tritium:0});
  assert.equal(battle.pvpFlights[0].phase, "returning");
  await resolveDuePvpFlights(battle.pvpFlights[0].returnAt + 1);
  const home = (await api("/api/state", "GET", undefined, aCookie)).payload.state;
  assert.equal(home.pvpFlights.length, 0);
  assert.equal(home.combatReports.length, 1);
});

test("simulator applies the server's combat arithmetic", () => {
  const outcome = simulateBattle({attackerFleet:{battleship:1},defenses:{teslaCoil:2},commandCenter:1});
  assert.equal(outcome.attackPower, 2400);
  assert.equal(outcome.defensePower, 850);
  assert.equal(outcome.won, true);
  assert.equal(outcome.losses.battleship, 1);
  assert.equal(outcome.defenseLosses.teslaCoil, 1);
});

test("planet production settings persist in ten-percent steps", async () => {
  const signup = await api("/api/auth/register", "POST", {username:"EnergyPlanner",password:"secure1234"});
  const state = signup.payload.state;
  state.planets[0].productionLoad = {metal:70,crystal:35,tritium:0};
  await api("/api/state", "PUT", {state}, signup.cookie);
  const saved = (await api("/api/state", "GET", undefined, signup.cookie)).payload.state;
  assert.deepEqual(saved.planets[0].productionLoad, {metal:70,crystal:30,tritium:0});
});
