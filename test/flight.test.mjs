import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simulateBattle } from "../public/combat.js";
import { SPEED_START_AT, WORLD_SPEED, worldSpeedAt } from "../public/units.js";

const directory = await mkdtemp(join(tmpdir(), "orbital-flight-"));
process.env.ACCOUNT_FILE = join(directory, "accounts.json");
process.env.PORT = "4797";
delete process.env.DATABASE_URL;
const { server, resolveDuePvpFlights, flightDuration } = await import("../server.mjs");
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
      assert.equal(state.planets[0].buildings[`${key}Storage`], 3);
    }
    assert.equal(state.planets[0].usedFields, 12);
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
  assert.ok(spy.arrivesAt - spy.departedAt >= (worldSpeedAt(spy.departedAt) === 1 ? 120000 : 60000));
  const beforeSpy = (await api("/api/state", "GET", undefined, aCookie)).payload.state;
  assert.equal(beforeSpy.spyReports.length, 0);
  assert.equal(beforeSpy.ships.spyProbe, 3);
  assert.equal((await api("/api/state", "GET", undefined, bCookie)).payload.state.incomingFlights[0].id, spy.id);
  await resolveDuePvpFlights(spy.arrivesAt + 1);
  const afterSpy = (await api("/api/state", "GET", undefined, aCookie)).payload.state;
  assert.equal(afterSpy.spyReports.length, 1);
  assert.equal(afterSpy.spyReports[0].expiresAt, undefined, "new reports are permanent snapshots");
  assert.equal(afterSpy.pvpFlights[0].phase, "returning");
  const scannedDefender = (await api("/api/state", "GET", undefined, bCookie)).payload.state;
  assert.equal(scannedDefender.incomingFlights.length, 0);
  assert.equal(scannedDefender.spyReports[0].side, "defender");
  await resolveDuePvpFlights(afterSpy.pvpFlights[0].returnAt + 1);
  assert.equal((await api("/api/state", "GET", undefined, aCookie)).payload.state.pvpFlights.length, 0);

  const database = JSON.parse(await readFile(process.env.ACCOUNT_FILE, "utf8"));
  database.accounts.flightalpha.state.spyReports[0].expiresAt = Date.now() - 60_000;
  database.accounts.flightalpha.state.spyReports[0].intelligence = 1;
  database.accounts.flightalpha.state.spyReports[0].ships = null;
  database.accounts.flightalpha.state.spyReports[0].defenses = null;
  await writeFile(process.env.ACCOUNT_FILE, JSON.stringify(database, null, 2), "utf8");
  const archivedReport = (await api("/api/state", "GET", undefined, aCookie)).payload.state.spyReports[0];
  assert.ok(archivedReport.expiresAt < Date.now(), "test report is older than its former validity window");

  const raid = (await api("/api/raids", "POST", {targetId:target.id,fleet:{battleship:1}}, aCookie)).payload.flight;
  assert.ok(raid.arrivesAt - raid.departedAt >= (worldSpeedAt(raid.departedAt) === 1 ? 240000 : 180000));
  assert.equal((await api("/api/state", "GET", undefined, bCookie)).payload.state.incomingFlights[0].id, raid.id);
  const defender = (await api("/api/state", "GET", undefined, bCookie)).payload.state;
  for (const key of ["metal","crystal","tritium"]) {
    defender.resources[key] = 0;
    defender.planets.find(planet => planet.id === defender.activePlanetId).resources[key] = 0;
  }
  defender.ships.frigate = 2;
  defender.planets.find(planet => planet.id === defender.activePlanetId).defenses = {rocketBattery:3,teslaCoil:2};
  await api("/api/state", "PUT", {state:defender}, bCookie);
  await resolveDuePvpFlights(raid.arrivesAt + 1);
  const battle = (await api("/api/state", "GET", undefined, aCookie)).payload.state;
  assert.equal(battle.combatReports.length, 1);
  assert.deepEqual(battle.combatReports[0].loot, {metal:0,crystal:0,tritium:0});
  assert.equal(battle.combatReports[0].attackerFleet.battleship, 1);
  assert.equal(battle.combatReports[0].defenderFleet.frigate, 2);
  assert.equal(battle.combatReports[0].defenses.rocketBattery, 3);
  assert.equal(battle.combatReports[0].defenses.teslaCoil, 2);
  const defenderReport = (await api("/api/state", "GET", undefined, bCookie)).payload.state.combatReports[0];
  assert.deepEqual(defenderReport.attackerFleet, battle.combatReports[0].attackerFleet);
  assert.deepEqual(defenderReport.defenderFleet, battle.combatReports[0].defenderFleet);
  assert.deepEqual(defenderReport.defenses, battle.combatReports[0].defenses);
  assert.equal(battle.pvpFlights[0].phase, "returning");
  await resolveDuePvpFlights(battle.pvpFlights[0].returnAt + 1);
  const home = (await api("/api/state", "GET", undefined, aCookie)).payload.state;
  assert.equal(home.pvpFlights.length, 0);
  assert.equal(home.combatReports.length, 1);

  const rescanDatabase = JSON.parse(await readFile(process.env.ACCOUNT_FILE, "utf8"));
  rescanDatabase.accounts.flightalpha.state.lastSpyAt = Date.now() - 20_000;
  await writeFile(process.env.ACCOUNT_FILE, JSON.stringify(rescanDatabase, null, 2), "utf8");
  const rescan = (await api("/api/spy", "POST", {targetId:target.id,probes:1}, aCookie)).payload.flight;
  assert.equal(rescan.kind, "spy", "a known target can be scanned again from its report");
});

test("a visible occupied planet can be attacked without any spy report", async () => {
  const attacker = await api("/api/auth/register", "POST", {username:"BlindAlpha",password:"secure1234"});
  const defender = await api("/api/auth/register", "POST", {username:"BlindBeta",password:"secure1234"});
  const state = attacker.payload.state;
  state.ships.battleship = 1;
  await api("/api/state", "PUT", {state}, attacker.cookie);
  const galaxy = (await api("/api/galaxy", "GET", undefined, attacker.cookie)).payload;
  const target = galaxy.contacts.find(contact => contact.owner === "BlindBeta");
  assert.ok(target, "target visible for a blind attack");
  assert.equal((await api("/api/state", "GET", undefined, attacker.cookie)).payload.state.spyReports.length, 0);
  const raid = (await api("/api/raids", "POST", {targetId:target.id,fleet:{battleship:1}}, attacker.cookie)).payload.flight;
  assert.equal(raid.kind, "raid");
  assert.equal((await api("/api/state", "GET", undefined, defender.cookie)).payload.state.incomingFlights[0].id, raid.id);
});

test("speed transition keeps prior flights unchanged and preserves PvP warning time", () => {
  const attacker = {id:"speed-a",state:{research:{combustionDrive:0},planets:[{id:"a",position:{x:10,y:10}}]}};
  const defender = {id:"speed-b",state:{planets:[{id:"b",position:{x:10,y:10}}]}};
  assert.equal(worldSpeedAt(SPEED_START_AT - 1), 1);
  assert.equal(worldSpeedAt(SPEED_START_AT), WORLD_SPEED);
  assert.equal(flightDuration(attacker, defender, true, SPEED_START_AT - 1), 180000);
  assert.equal(flightDuration(attacker, defender, true, SPEED_START_AT), 60000);
  assert.equal(flightDuration(attacker, defender, false, SPEED_START_AT - 1), 360000);
  assert.equal(flightDuration(attacker, defender, false, SPEED_START_AT), 180000);
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
