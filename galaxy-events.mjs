import { randomBytes } from 'node:crypto';
import { FLEET, shipCargo, flightFuel, worldSpeedAt } from './public/units.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const RESOURCES = ['metal', 'crystal', 'tritium'];
const whole = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
const remaining = resources => RESOURCES.reduce((total, key) => total + whole(resources?.[key]), 0);
const randomInt = (random, maximum) => Math.floor(random() * maximum);
const coordinates = (random) => {
  const galaxy = 1 + randomInt(random, 3);
  const sector = 1 + randomInt(random, 50);
  return { galaxy, sector, orbit: 16, position: { x: (galaxy - 1) * 70 + 35, y: (sector - 1) * 4.4 + 2 } };
};

export function spawnAnomaly(now, random = Math.random) {
  const comet = random() < .7;
  return {
    id: randomBytes(12).toString('hex'),
    type: comet ? 'COMET' : 'BLACK_HOLE',
    name: comet ? 'Kryo-Erzkomet' : 'Instabile Singularität',
    ...coordinates(random),
    spawnedAt: now,
    expiresAt: now + 12 * HOUR,
    resources: comet
      ? { metal: 50_000 + randomInt(random, 150_001), crystal: 40_000 + randomInt(random, 100_001), tritium: 20_000 + randomInt(random, 60_001) }
      : { metal: 0, crystal: 0, tritium: 80_000 + randomInt(random, 180_001) },
  };
}

export function spawnBoss(now, random = Math.random) {
  return {
    id: randomBytes(12).toString('hex'),
    name: 'Xeno-Leviathan Mutterschiff',
    ...coordinates(random),
    spawnedAt: now,
    expiresAt: now + 7 * DAY,
    maxHp: 1_500_000,
    currentHp: 1_500_000,
    shieldPower: 500,
    status: 'ACTIVE',
    lootPool: { metal: 1_500_000, crystal: 1_000_000, tritium: 500_000 },
    leaderboard: {},
  };
}

export function createEventWorld(now = Date.now(), random = Math.random) {
  return {
    version: 1,
    anomalies: [spawnAnomaly(now, random), spawnAnomaly(now, random)],
    boss: spawnBoss(now, random),
    pastBosses: [],
    nextAnomalyAt: now + 3 * HOUR,
    pendingPayouts: {},
  };
}

export function refreshEventWorld(world, now = Date.now(), random = Math.random) {
  world.anomalies ??= [];
  world.pendingPayouts ??= {};
  world.pastBosses ??= [];
  // Keep an expired event briefly so flights that arrived before expiry can settle.
  world.anomalies = world.anomalies.filter(item => item.expiresAt + DAY > now && remaining(item.resources) > 0);
  if (now >= whole(world.nextAnomalyAt || now)) {
    if (world.anomalies.filter(item => item.expiresAt > now).length < 6) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const next = spawnAnomaly(now, random);
        if (!world.anomalies.some(item => item.galaxy === next.galaxy && item.sector === next.sector)) {
          world.anomalies.push(next);
          break;
        }
      }
    }
    world.nextAnomalyAt = now + 3 * HOUR;
  }
  world.pastBosses = world.pastBosses.filter(boss => boss.expiresAt + DAY > now);
  if (!world.boss || world.boss.expiresAt <= now) {
    if (world.boss) world.pastBosses.push(world.boss);
    world.boss = spawnBoss(now, random);
  }
  return world;
}

export function publicEventWorld(world, now = Date.now()) {
  const boss = world.boss && world.boss.expiresAt > now ? world.boss : null;
  const leaderboard = boss ? Object.values(boss.leaderboard || {}).sort((a, b) => b.damage - a.damage)
    .map((entry, index, all) => ({
      rank: index + 1,
      playerName: entry.playerName,
      damage: entry.damage,
      sharePercent: all.reduce((sum, row) => sum + row.damage, 0) > 0
        ? Math.round(entry.damage / all.reduce((sum, row) => sum + row.damage, 0) * 10_000) / 100 : 0,
    })) : [];
  const publicBoss = boss ? (({ position, ...details }) => details)(boss) : null;
  return {
    anomalies: (world.anomalies || []).filter(item => item.expiresAt > now && remaining(item.resources) > 0)
      .map(({ position, ...item }) => item),
    worldBoss: publicBoss ? { ...publicBoss, leaderboard } : null,
    updatedAt: now,
  };
}

export function startEventFlight(account, world, request, originPosition, now = Date.now()) {
  const kind = request.kind === 'harvest' ? 'harvest' : request.kind === 'boss' ? 'boss' : null;
  if (!kind) throw Object.assign(new Error('Unbekannter Ereignisauftrag.'), { status: 400 });
  const event = kind === 'harvest'
    ? world.anomalies.find(item => item.id === request.eventId && item.expiresAt > now && remaining(item.resources) > 0)
    : world.boss?.id === request.eventId && world.boss.status === 'ACTIVE' && world.boss.expiresAt > now ? world.boss : null;
  if (!event) throw Object.assign(new Error('Dieses Ereignis ist nicht mehr verfügbar.'), { status: 404 });
  const fleet = kind === 'harvest'
    ? { recycler: Number(request.recyclerCount) }
    : Object.fromEntries(Object.keys(FLEET).map(key => [key, Number(request.fleet?.[key] || 0)]).filter(([, count]) => count > 0));
  if (!Object.keys(fleet).length || Object.values(fleet).some(count => !Number.isSafeInteger(count) || count < 1 || count > 100_000))
    throw Object.assign(new Error('Wähle eine gültige Flotte.'), { status: 400 });
  if (kind === 'boss' && !Object.entries(fleet).some(([key, count]) => count && FLEET[key].power >= 45))
    throw Object.assign(new Error('Für den Boss werden Kampfschiffe benötigt.'), { status: 400 });
  for (const [key, count] of Object.entries(fleet)) if (count > whole(account.state.ships?.[key]))
    throw Object.assign(new Error('Nicht genügend Schiffe verfügbar.'), { status: 400 });
  account.state.eventFlights ??= [];
  if (account.state.eventFlights.length >= 10) throw Object.assign(new Error('Maximal zehn Ereignisflüge gleichzeitig.'), { status: 409 });
  const distance = Math.hypot(originPosition.x - event.position.x, originPosition.y - event.position.y);
  const fuel = flightFuel(fleet, distance, account.state.career?.path, kind === 'boss' ? 'raid' : 'recycle');
  const source = account.state.planets.find(planet => planet.id === account.state.activePlanetId) || account.state.planets[0];
  if (whole(source.resources?.tritium) < fuel) throw Object.assign(new Error(`Nicht genügend Tritium: ${fuel} für den Flug erforderlich.`), { status: 400 });
  const drive = whole(account.state.research?.combustionDrive);
  const duration = Math.round(Math.max(120_000, (360_000 + distance * 10_000) / ((1 + drive * .12) * worldSpeedAt(now))));
  source.resources.tritium -= fuel;
  for (const [key, count] of Object.entries(fleet)) account.state.ships[key] -= count;
  const flight = {
    id: randomBytes(12).toString('hex'), kind, eventId: event.id, eventName: event.name,
    sourcePlanetId: source.id, fleet, fuel, departedAt: now, arrivesAt: now + duration,
    returnAt: now + duration * 2, duration, phase: 'outgoing',
  };
  account.state.eventFlights.push(flight);
  account.state.revision = whole(account.state.revision) + 1;
  return flight;
}

function distributeBossLoot(world, boss) {
  const entries = Object.entries(boss.leaderboard || {});
  const damage = entries.reduce((sum, [, entry]) => sum + entry.damage, 0);
  if (!damage) return;
  for (const [accountId, entry] of entries) {
    const reward = Object.fromEntries(RESOURCES.map(key => [key, Math.floor(boss.lootPool[key] * entry.damage / damage)]));
    world.pendingPayouts[accountId] ??= [];
    world.pendingPayouts[accountId].push({ bossId: boss.id, reward });
  }
}

function finishOutbound(account, world, flight, now, random) {
  flight.survivors = { ...flight.fleet };
  flight.loot = { metal: 0, crystal: 0, tritium: 0 };
  if (flight.kind === 'harvest') {
    const anomaly = world.anomalies.find(item => item.id === flight.eventId);
    if (anomaly && flight.arrivesAt <= anomaly.expiresAt && remaining(anomaly.resources)) {
      if (anomaly.type === 'BLACK_HOLE' && random() < .15) {
        flight.lostRecyclers = Math.max(1, Math.ceil(flight.fleet.recycler * .15));
        flight.survivors.recycler = Math.max(0, flight.fleet.recycler - flight.lostRecyclers);
      }
      let capacity = flight.survivors.recycler * shipCargo('recycler', account.state.career?.path);
      for (const key of RESOURCES) {
        flight.loot[key] = Math.min(capacity, whole(anomaly.resources[key]));
        anomaly.resources[key] -= flight.loot[key];
        capacity -= flight.loot[key];
      }
    }
    account.state.eventReports ??= [];
    account.state.eventReports.unshift({ id: flight.id, at: now, kind: 'harvest', name: flight.eventName, loot: flight.loot, lostRecyclers: flight.lostRecyclers || 0 });
  } else {
    const boss = world.boss?.id === flight.eventId ? world.boss : world.pastBosses?.find(item => item.id === flight.eventId);
    if (boss?.id === flight.eventId && flight.arrivesAt <= boss.expiresAt && boss.status === 'ACTIVE') {
      const firepower = Object.entries(flight.fleet).reduce((sum, [key, count]) => sum + FLEET[key].power * count, 0);
      const avionics = whole(account.state.research?.avionics);
      const power = Math.floor(firepower * (1 + Math.min(avionics, 100) * .05) * (account.state.career?.path === 'warrior' ? 1.1 : 1));
      flight.damage = Math.min(boss.currentHp, Math.max(Math.floor(power * .1), power - boss.shieldPower));
      boss.currentHp -= flight.damage;
      boss.leaderboard[account.id] ??= { playerName: account.username, damage: 0 };
      boss.leaderboard[account.id].damage += flight.damage;
      const lossRate = Math.min(.15, boss.shieldPower / Math.max(1, power + boss.shieldPower) * .15);
      for (const [key, count] of Object.entries(flight.fleet))
        if (FLEET[key].power >= 45) flight.survivors[key] = Math.max(0, count - Math.ceil(count * lossRate));
      if (boss.currentHp <= 0) {
        boss.currentHp = 0;
        boss.status = 'DEFEATED';
        distributeBossLoot(world, boss);
      }
    } else flight.damage = 0;
    account.state.eventReports ??= [];
    account.state.eventReports.unshift({ id: flight.id, at: now, kind: 'boss', name: flight.eventName, damage: flight.damage, losses: Object.fromEntries(Object.entries(flight.fleet).map(([key, count]) => [key, count - whole(flight.survivors[key])]).filter(([, count]) => count)), defeated: boss?.status === 'DEFEATED' });
  }
  account.state.eventReports = account.state.eventReports.slice(0, 20);
  flight.phase = 'returning';
  flight.returnAt = flight.arrivesAt + flight.duration;
}

export function settleEventFlights(account, world, now = Date.now(), random = Math.random) {
  let changed = false;
  account.state.eventFlights ??= [];
  for (const flight of [...account.state.eventFlights]) {
    if (flight.phase === 'outgoing' && flight.arrivesAt <= now) {
      finishOutbound(account, world, flight, now, random);
      changed = true;
    }
    if (flight.phase === 'returning' && flight.returnAt <= now) {
      for (const [key, count] of Object.entries(flight.survivors || {}))
        account.state.ships[key] = whole(account.state.ships[key]) + whole(count);
      const source = account.state.planets.find(planet => planet.id === flight.sourcePlanetId) || account.state.planets[0];
      for (const key of RESOURCES) source.resources[key] = whole(source.resources[key]) + whole(flight.loot?.[key]);
      account.state.eventFlights = account.state.eventFlights.filter(item => item.id !== flight.id);
      changed = true;
    }
  }
  const payouts = world.pendingPayouts?.[account.id] || [];
  if (payouts.length) {
    const source = account.state.planets[0];
    for (const payout of payouts) for (const key of RESOURCES)
      source.resources[key] = whole(source.resources[key]) + whole(payout.reward[key]);
    account.state.eventReports ??= [];
    account.state.eventReports.unshift(...payouts.map(payout => ({ id: `reward-${payout.bossId}`, at: now, kind: 'reward', name: 'Xeno-Leviathan Mutterschiff', loot: payout.reward })));
    account.state.eventReports = account.state.eventReports.slice(0, 20);
    delete world.pendingPayouts[account.id];
    changed = true;
  }
  if (changed) account.state.revision = whole(account.state.revision) + 1;
  return changed;
}
