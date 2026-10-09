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
const { server, resolveDuePvpFlights, flightDuration, advanceNpcWorld } = await import("../server.mjs");
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
  assert.equal(battle.combatReports[0].defenderShipLosses.frigate, 1);
  assert.equal(battle.combatReports[0].defenses.rocketBattery, 3);
  assert.equal(battle.combatReports[0].defenses.teslaCoil, 2);
  const defenderReport = (await api("/api/state", "GET", undefined, bCookie)).payload.state.combatReports[0];
  assert.deepEqual(defenderReport.attackerFleet, battle.combatReports[0].attackerFleet);
  assert.deepEqual(defenderReport.defenderFleet, battle.combatReports[0].defenderFleet);
  assert.deepEqual(defenderReport.defenderShipLosses, battle.combatReports[0].defenderShipLosses);
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
  assert.equal(outcome.losses.battleship, 0);
  assert.equal(outcome.capacity, 3500);
  assert.equal(outcome.defenseLosses.teslaCoil, 1);
});

test("winning raid takes ninety percent of arrival stock within surviving cargo space and records defender losses", async () => {
  const attacker = await api("/api/auth/register", "POST", {username:"LootAlpha",password:"secure1234"});
  const defender = await api("/api/auth/register", "POST", {username:"LootBeta",password:"secure1234"});
  const attackerState = attacker.payload.state;
  attackerState.ships.battleship = 1;
  await api("/api/state", "PUT", {state:attackerState}, attacker.cookie);
  const target = (await api("/api/galaxy", "GET", undefined, attacker.cookie)).payload.contacts.find(contact => contact.owner === "LootBeta");
  const flight = (await api("/api/raids", "POST", {targetId:target.id,fleet:{battleship:1}}, attacker.cookie)).payload.flight;
  const targetState = (await api("/api/state", "GET", undefined, defender.cookie)).payload.state;
  targetState.ships.frigate = 1;
  const planet = targetState.planets.find(item => item.id === targetState.activePlanetId);
  planet.defenses = {rocketBattery:1};
  for (const resource of ["metal", "crystal", "tritium"]) {
    planet.resources[resource] = 1000;
    targetState.resources[resource] = 1000;
  }
  await api("/api/state", "PUT", {state:targetState}, defender.cookie);
  await resolveDuePvpFlights(flight.arrivesAt + 1);
  const attackerAfter = (await api("/api/state", "GET", undefined, attacker.cookie)).payload.state;
  const defenderAfter = (await api("/api/state", "GET", undefined, defender.cookie)).payload.state;
  const report = attackerAfter.combatReports[0];
  assert.equal(report.won, true);
  assert.deepEqual(report.loot, {metal:900,crystal:900,tritium:900});
  assert.equal(report.capacity, 3500);
  assert.equal(report.defenderFleet.frigate, 1);
  assert.equal(report.defenderShipLosses.frigate, 1);
  assert.equal(report.defenseLosses.rocketBattery, 1);
  assert.equal(defenderAfter.ships.frigate, 0);
  for (const resource of ["metal", "crystal", "tritium"]) assert.equal(defenderAfter.planets[0].resources[resource], 100);
  assert.deepEqual(defenderAfter.combatReports[0].loot, report.loot);
  await resolveDuePvpFlights(attackerAfter.pvpFlights[0].returnAt + 1);
  const returned = (await api("/api/state", "GET", undefined, attacker.cookie)).payload.state;
  for (const resource of ["metal", "crystal", "tritium"]) assert.equal(returned.planets[0].resources[resource], 100900);
});

test("planet production settings persist in ten-percent steps", async () => {
  const signup = await api("/api/auth/register", "POST", {username:"EnergyPlanner",password:"secure1234"});
  const state = signup.payload.state;
  state.planets[0].productionLoad = {metal:70,crystal:35,tritium:0};
  await api("/api/state", "PUT", {state}, signup.cookie);
  const saved = (await api("/api/state", "GET", undefined, signup.cookie)).payload.state;
  assert.deepEqual(saved.planets[0].productionLoad, {metal:70,crystal:30,tritium:0});
});


test("NPC worlds persist, can be scouted and raided, and replenish depleted resources gradually", async () => {
  const signup = await api("/api/auth/register","POST",{username:"NpcHunter",password:"secure1234"});
  const state = signup.payload.state;
  state.research.deepSpaceSensors = 100;
  state.ships.spyProbe = 6;
  state.ships.battleship = 50;
  state.ships.largeTransport = 10;
  await api("/api/state","PUT",{state},signup.cookie);
  const galaxy = (await api("/api/galaxy","GET",undefined,signup.cookie)).payload;
  const camps = galaxy.contacts.filter(contact=>contact.npc);
  assert.equal(camps.length,6);
  const target = camps.find(contact=>contact.npcPassive);
  assert.ok(galaxy.systems.some(system=>system.slots.some(slot=>slot.targetId===target.id && slot.npc)));
  assert.ok(!(await api("/api/leaderboard")).payload.some(player=>player.commander.startsWith("NPC ")));
  const spy = (await api("/api/spy","POST",{targetId:target.id,probes:5},signup.cookie)).payload.flight;
  await resolveDuePvpFlights(spy.arrivesAt+1);
  const scan = (await api("/api/state","GET",undefined,signup.cookie)).payload.state.spyReports[0];
  assert.equal(scan.targetId,target.id);
  assert.equal(scan.resources.metal,30000);
  const raid = (await api("/api/raids","POST",{targetId:target.id,fleet:{battleship:50,largeTransport:10}},signup.cookie)).payload.flight;
  await resolveDuePvpFlights(raid.arrivesAt+1);
  const after = (await api("/api/state","GET",undefined,signup.cookie)).payload.state;
  assert.deepEqual(after.combatReports[0].loot,{metal:27000,crystal:16200,tritium:8100});
  const database = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  const npc = Object.values(database.accounts).find(account=>account.id===target.id.split(":")[0]);
  assert.equal(npc.state.planets[0].resources.metal,3000);
  const lastUpdate = npc.state.npc.updatedAt;
  await advanceNpcWorld(lastUpdate+60*60_000,false);
  const regenerated = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  const saved = Object.values(regenerated.accounts).find(account=>account.id===npc.id);
  assert.equal(saved.state.planets[0].resources.metal,6000);
  assert.equal(Object.values(regenerated.accounts).filter(account=>account.id.startsWith("npc-")).length,6);
});

test("NPCs protect beginners, scout before attacking, show warnings, and keep player attack cooldowns", async () => {
  const signup = await api("/api/auth/register","POST",{username:"NpcDefender",password:"secure1234"});
  const now = Date.now();
  let database = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  const npc = database.accounts["!npc:npc-corsairs"];
  for (const account of Object.values(database.accounts).filter(account=>account.id.startsWith("npc-")))
    account.state.npc.nextActionAt = now+24*60*60_000;
  npc.state.npc.nextActionAt = now;
  npc.state.npc.nextKind = "spy";
  npc.state.pvpFlights = [];
  const player = database.accounts.npcdefender;
  player.state.planets[0].position = {...npc.state.planets[0].position};
  await writeFile(process.env.ACCOUNT_FILE,JSON.stringify(database),"utf8");
  await advanceNpcWorld(now);
  database = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  assert.equal(database.accounts["!npc:npc-corsairs"].state.pvpFlights.length,0,"no beginner is targeted");
  database.accounts.npcdefender.createdAt = now-25*60*60_000;
  database.accounts["!npc:npc-corsairs"].state.npc.nextActionAt = now;
  await writeFile(process.env.ACCOUNT_FILE,JSON.stringify(database),"utf8");
  await advanceNpcWorld(now);
  database = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  const spy = database.accounts["!npc:npc-corsairs"].state.pvpFlights[0];
  assert.equal(spy.kind,"spy");
  assert.ok(spy.npc);
  assert.ok(spy.arrivesAt-spy.departedAt>=5*60_000);
  assert.equal(database.accounts.npcdefender.state.incomingFlights[0].id,spy.id);
  await resolveDuePvpFlights(spy.arrivesAt+1);
  database = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  assert.equal(database.accounts.npcdefender.state.spyReports[0].side,"defender");
  const returning = database.accounts["!npc:npc-corsairs"].state.pvpFlights[0];
  await resolveDuePvpFlights(returning.returnAt+1);
  await advanceNpcWorld(returning.returnAt+6*60_000);
  database = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  const raid = database.accounts["!npc:npc-corsairs"].state.pvpFlights[0];
  assert.equal(raid.kind,"raid");
  assert.ok(raid.arrivesAt-raid.departedAt>=15*60_000);
  assert.equal(database.accounts.npcdefender.state.incomingFlights[0].id,raid.id);
  const clientState = (await api("/api/state","GET",undefined,signup.cookie)).payload.state;
  const lastRaidAt = clientState.npcLastRaidAt;
  clientState.npcLastRaidAt = 0;
  clientState.npcLastSpyAt = 0;
  await api("/api/state","PUT",{state:clientState},signup.cookie);
  assert.equal((await api("/api/state","GET",undefined,signup.cookie)).payload.state.npcLastRaidAt,lastRaidAt);
  await resolveDuePvpFlights(raid.arrivesAt+1);
  const battleState = (await api("/api/state","GET",undefined,signup.cookie)).payload.state;
  assert.equal(battleState.incomingFlights.length,0);
  assert.equal(battleState.combatReports[0].opponent,"NPC Nebelkorsaren");
  database = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  const other = database.accounts["!npc:npc-marauders"];
  other.state.spyReports = database.accounts["!npc:npc-corsairs"].state.spyReports;
  other.state.npc.nextKind = "raid";
  other.state.npc.nextActionAt = raid.arrivesAt;
  other.state.planets[0].position = {...database.accounts.npcdefender.state.planets[0].position};
  await writeFile(process.env.ACCOUNT_FILE,JSON.stringify(database),"utf8");
  await advanceNpcWorld(raid.arrivesAt+2);
  database = JSON.parse(await readFile(process.env.ACCOUNT_FILE,"utf8"));
  assert.equal(database.accounts["!npc:npc-marauders"].state.pvpFlights.length,0,"six-hour cooldown is shared by all NPC factions");
});
