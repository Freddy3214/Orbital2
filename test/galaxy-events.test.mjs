import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventWorld, publicEventWorld, startEventFlight, settleEventFlights } from '../galaxy-events.mjs';

const account = (id, ships = {}) => ({
  id, username: id,
  state: {
    activePlanetId: 'home', revision: 0, ships: { recycler: 0, cruiser: 0, ...ships },
    research: { combustionDrive: 0, avionics: 0 }, career: { path: null },
    planets: [{ id: 'home', resources: { metal: 0, crystal: 0, tritium: 100_000 } }],
    eventFlights: [],
  },
});

test('anomaly salvage requires owned recyclers, costs tritium, and pays only after return', () => {
  const now = Date.now();
  const world = createEventWorld(now, () => .1);
  const event = world.anomalies[0];
  const player = account('commander', { recycler: 2 });
  assert.throws(() => startEventFlight(player, world, { kind: 'harvest', eventId: event.id, recyclerCount: 3 }, { x: 30, y: 20 }, now), /Nicht genügend Schiffe/);
  const flight = startEventFlight(player, world, { kind: 'harvest', eventId: event.id, recyclerCount: 2 }, { x: 30, y: 20 }, now);
  assert.equal(player.state.ships.recycler, 0);
  assert.ok(player.state.planets[0].resources.tritium < 100_000);
  assert.equal(player.state.planets[0].resources.metal, 0);
  assert.equal(settleEventFlights(player, world, flight.arrivesAt, () => .9), true);
  assert.equal(player.state.planets[0].resources.metal, 0);
  const loot = { ...flight.loot };
  assert.ok(loot.metal > 0);
  assert.equal(settleEventFlights(player, world, flight.returnAt, () => .9), true);
  assert.equal(player.state.ships.recycler, 2);
  assert.equal(player.state.planets[0].resources.metal, loot.metal);
  assert.equal(settleEventFlights(player, world, flight.returnAt + 1), false);
  assert.equal(player.state.planets[0].resources.metal, loot.metal);
});

test('boss damage comes from committed ships and rewards are claimed once', () => {
  const now = Date.now();
  const world = createEventWorld(now, () => .2);
  world.boss.currentHp = 100;
  const player = account('fighter', { cruiser: 2 });
  assert.throws(() => startEventFlight(player, world, { kind: 'boss', eventId: world.boss.id, fleet: { cruiser: 3 } }, { x: 30, y: 20 }, now), /Nicht genügend Schiffe/);
  const flight = startEventFlight(player, world, { kind: 'boss', eventId: world.boss.id, fleet: { cruiser: 2 } }, { x: 30, y: 20 }, now);
  assert.equal(player.state.ships.cruiser, 0);
  settleEventFlights(player, world, flight.arrivesAt, () => .9);
  assert.equal(world.boss.status, 'DEFEATED');
  assert.equal(world.boss.currentHp, 0);
  assert.equal(publicEventWorld(world, flight.arrivesAt).worldBoss.leaderboard[0].playerName, 'fighter');
  assert.equal(player.state.planets[0].resources.metal, world.boss.lootPool.metal);
  settleEventFlights(player, world, flight.returnAt, () => .9);
  assert.equal(player.state.planets[0].resources.metal, world.boss.lootPool.metal);
  const paid = player.state.planets[0].resources.metal;
  settleEventFlights(player, world, flight.returnAt + 1);
  assert.equal(player.state.planets[0].resources.metal, paid);
});
