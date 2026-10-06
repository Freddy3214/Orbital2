import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import pg from "pg";
import { FLEET, DEFENSE, worldSpeedAt } from "./public/units.js";
import { simulateBattle } from "./public/combat.js";
import { requestLocale } from "./locale.mjs";

const scrypt = promisify(scryptCallback);
const root = dirname(fileURLToPath(import.meta.url));
const publicRoot = join(root, "public");
const accountFile = process.env.ACCOUNT_FILE || join(root, "data", "accounts.json");
const port = Number(process.env.PORT || 4173);
const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const sessions = new Map();
const sessionLifetime = 1000 * 60 * 60 * 24 * 30;
const LEVEL_CAP = 100;
const GALAXY_SPAN = 220;
const FRONTIER_SITE_COUNT = 420;
const RESOURCE_KEYS = ["metal", "crystal", "tritium"];
const STARTER_RESOURCES = 100_000;
const STARTER_STORAGE_LEVEL = 3;
const STARTER_BOOST_MS = 2 * 60 * 60_000;
const MAX_PLANETS = 8;
const TEST_ACCOUNT_USERNAME = process.env.TEST_ACCOUNT_USERNAME || "Lord Fredo";
let mutationChain = Promise.resolve();
function mutate(action) {
  const result = mutationChain.then(action);
  mutationChain = result.catch(() => {});
  return result;
}
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp",
};

const freshBuildings = (homeworld = false) => ({
  commandCenter: 1, metalMine: homeworld ? 1 : 0, crystalMine: 0, tritiumSynthesizer: 0, solarPlant: homeworld ? 1 : 0,
  roboticsFactory: 0, researchLab: 0, shipyard: 0,
  metalStorage: homeworld ? STARTER_STORAGE_LEVEL : 0,
  crystalStorage: homeworld ? STARTER_STORAGE_LEVEL : 0,
  tritiumStorage: homeworld ? STARTER_STORAGE_LEVEL : 0,
});
const randomWorldName = (seedValue) => {
  const names = ["Aurelia", "Nerys", "Kallisto", "Ithara", "Myris", "Solis", "Caelia", "Orison", "Tethys", "Novara", "Elyra", "Dravos"];
  return names[stableHash(seedValue) % names.length];
};
const defaultState = (commander, position) => {
  const now = Date.now();
  const buildings = freshBuildings(true);
  const resources = { metal: STARTER_RESOURCES, crystal: STARTER_RESOURCES, tritium: STARTER_RESOURCES, lastUpdate: now };
  const worldName = randomWorldName(`${commander}:${now}`);
  return ({
  version: 4, commander, createdAt: now,
  resources,
  buildBoostFrom: now, buildBoostUntil: now + STARTER_BOOST_MS,
  buildings: { ...buildings },
  research: { energyTech: 0, combustionDrive: 0, plasmaTheory: 0, avionics: 0, deepSpaceSensors: 0, constructionEngineering: 0, computerTech: 0, storageTech: 0 },
  ships: { cargoDrone: 0, interceptor: 0, colonyShip: 0, spyProbe: 0 },
  activePlanetId: "vesta-prime",
  planets: [{
    id: "vesta-prime", name: worldName, type: "temperate", classification: "Gemäßigte Welt", fields: 228,
    usedFields: Object.values(buildings).reduce((sum, level) => sum + level, 0), coordinates: `X ${position.x.toFixed(1)} · Y ${position.y.toFixed(1)}`, position, colonizedAt: now, homeworld: true,
    buildings, resources, productionLoad: { metal: 100, crystal: 100, tritium: 100 }, buildingQueue: [], shipQueue: null, defenses: {},
  }],
  queues: { building: [], research: null, ship: null }, missions: [], pvpFlights: [], incomingFlights: [], spyReports: [], combatReports: [], messages: [], notifications: [],
  log: [{ at: now, type: "system", text: "Kommandozentrale verbunden. Deine Heimatwelt wartet auf Befehle." }],
  });
};

function cleanUsername(value) {
  const name = String(value || "").trim().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, " ").slice(0, 20);
  return name.length >= 3 ? name : "";
}
function accountKey(username) { return username.toLocaleLowerCase("de-DE"); }
function cleanPassword(value) { const password = String(value || ""); return password.length >= 8 && password.length <= 128 ? password : ""; }
function cleanPlanetName(value) { return String(value || "").trim().replace(/[^\p{L}\p{N} .'-]/gu, "").replace(/\s+/g, " ").slice(0, 28); }
function emptyDatabase() { return { version: 1, accounts: {} }; }
async function loadLocalDatabase() {
  try {
    const parsed = JSON.parse(await readFile(accountFile, "utf8"));
    return parsed && typeof parsed === "object" && parsed.accounts && typeof parsed.accounts === "object" ? parsed : emptyDatabase();
  } catch (error) {
    if (error.code === "ENOENT") return emptyDatabase();
    throw error;
  }
}
let writeChain = Promise.resolve();
function saveLocalDatabase(database) {
  writeChain = writeChain.then(async () => {
    await mkdir(dirname(accountFile), { recursive: true });
    await writeFile(accountFile, JSON.stringify(database, null, 2), "utf8");
  });
  return writeChain;
}
function normalizeAccount(account) {
  if (!account) return account;
  const state = account.state;
  const home = state.planets.find(p=>p.homeworld) || state.planets[0];
  for (const planet of state.planets) {
    planet.resources ??= planet === home ? {...state.resources} : {metal:0,crystal:0,tritium:0,lastUpdate:Date.now()};
  }
  const active = state.planets.find(p=>p.id===state.activePlanetId) || home;
  state.resources = active.resources;
  return account;
}
function boostFinish(duration, at, until) {
  const fastWork = Math.min(duration, Math.max(0, until-at)*20);
  return at + fastWork/20 + duration-fastWork;
}
function applyBuildBoost(state, now) {
  const oldUntil = Number(state.buildBoostUntil) || 0;
  const until = now + 60*60_000;
  const queues = [...state.planets.flatMap(p=>[p.buildingQueue?.[0],p.shipQueue]),state.queues?.research];
  for (const queue of queues.filter(Boolean)) {
    if (queue.completesAt <= now) continue;
    const remaining = queue.completesAt-now;
    const fast = Math.min(remaining, Math.max(0,oldUntil-now));
    const work = fast*20 + remaining-fast;
    queue.completesAt = boostFinish(work,now,until);
    queue.startedAt = now;
  }
  state.buildBoostUntil = until;
  state.buildBoostFrom = now;
}
function accountFromRow(row) {
  return normalizeAccount({
    id: row.id,
    username: row.username,
    createdAt: Number(row.created_at),
    password: { salt: row.password_salt, hash: row.password_hash },
    state: row.state,
  });
}
async function initializeStorage() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      account_key TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      state JSONB NOT NULL
    )
  `);
}
const storageReady = initializeStorage();
async function applyLordFredoCredit() {
  if (process.env.APPLY_LORD_FREDO_CREDIT !== "yes") return;
  await mutate(async () => {
    const key = accountKey("Lord Fredo");
    const account = await accountByKey(key);
    if (!account) throw new Error("Lord Fredo account not found");
    const creditId = "lord-fredo-20260918-20000";
    account.state.adminCredits = Array.isArray(account.state.adminCredits) ? account.state.adminCredits : [];
    if (account.state.adminCredits.includes(creditId)) return;
    for (const resource of RESOURCE_KEYS) account.state.resources[resource] = Math.min(Number.MAX_SAFE_INTEGER, asWholeNumber(account.state.resources?.[resource]) + 20_000);
    account.state.adminCredits = [...account.state.adminCredits, creditId];
    account.state.revision = asWholeNumber(account.state.revision) + 1;
    addStateLog(account.state, "system", "Admin-Gutschrift: +20.000 Metall, Kristall und Tritium.");
    if (pool) await pool.query("UPDATE accounts SET state = $2::jsonb WHERE account_key = $1", [key, JSON.stringify(account.state)]);
    else { const database = await loadLocalDatabase(); database.accounts[key].state = account.state; await saveLocalDatabase(database); }
    console.log("One-time Lord Fredo credit applied.");
  });
}
async function accountByKey(key) {
  if (pool) {
    const result = await pool.query(
      "SELECT id, username, created_at, password_salt, password_hash, state FROM accounts WHERE account_key = $1",
      [key],
    );
    return result.rows[0] ? accountFromRow(result.rows[0]) : null;
  }
  const database = await loadLocalDatabase();
  return normalizeAccount(database.accounts[key] || null);
}
async function createAccount(key, account) {
  if (pool) {
    await pool.query(
      "INSERT INTO accounts (id, account_key, username, created_at, password_salt, password_hash, state) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)",
      [account.id, key, account.username, account.createdAt, account.password.salt, account.password.hash, JSON.stringify(account.state)],
    );
    return;
  }
  const database = await loadLocalDatabase();
  database.accounts[key] = account;
  await saveLocalDatabase(database);
}
async function updateAccountState(key, state) {
  const previous = await accountByKey(key);
  if (asWholeNumber(state.revision) !== asWholeNumber(previous.state.revision)) fail("Der Spielstand hat sich geändert. Bitte synchronisieren.", 409);
  state.buildBoostUntil = previous.state.buildBoostUntil || 0;
  state.buildBoostFrom = previous.state.buildBoostFrom || 0;
  state.spyReports = previous.state.spyReports || [];
  state.lastSpyAt = previous.state.lastSpyAt || 0;
  // Flight manifests and inbound warnings are server-owned; clients may not forge or erase them.
  state.pvpFlights = previous.state.pvpFlights || [];
  state.incomingFlights = previous.state.incomingFlights || [];
  const readMessageIds = new Set((state.messages || []).filter(message => message.read === true).map(message => message.id));
  state.messages = (previous.state.messages || [])
    .map(message => ({ ...message, read: message.read === true || readMessageIds.has(message.id) }))
    .sort((a,b)=>b.at-a.at)
    .slice(0, 80);
  state.combatReports = previous.state.combatReports || [];
  const readNotificationIds = new Set((state.notifications || []).filter(notice => notice.read === true).map(notice => notice.id));
  state.notifications = (previous.state.notifications || [])
    .map(notice => ({ ...notice, read: notice.read === true || readNotificationIds.has(notice.id) }))
    .sort((a,b)=>b.at-a.at)
    .slice(0, 40);
  const incomingPlanets = new Map(state.planets.map((planet) => [planet.id, planet]));
  state.planets = state.planets.filter(p => !String(p.id).startsWith("frontier-"));
  state.planets.push(...previous.state.planets.filter(p => String(p.id).startsWith("frontier-")).map((planet) => {
    const incoming = incomingPlanets.get(planet.id);
    if (!incoming) return planet;
    return {
      ...planet,
      name: cleanPlanetName(incoming.name) || planet.name,
      buildings: incoming.buildings || planet.buildings || freshBuildings(false),
      buildingQueue: Array.isArray(incoming.buildingQueue) ? incoming.buildingQueue : [],
      shipQueue: incoming.shipQueue || null,
      shipWaiting: incoming.shipWaiting || [],
      resources: incoming.resources || planet.resources,
      usedFields: asWholeNumber(incoming.usedFields),
      defenses: incoming.defenses || planet.defenses || {},
    };
  }));
  for (const planet of state.planets) planet.defenses = Object.fromEntries(Object.keys(DEFENSE).map(key=>[key,asWholeNumber(planet.defenses?.[key])]));
  normalizeAccount({state});
  state.revision = asWholeNumber(previous.state.revision) + 1;
  if (pool) {
    await pool.query("UPDATE accounts SET state = $2::jsonb WHERE account_key = $1", [key, JSON.stringify(state)]);
    return;
  }
  const database = await loadLocalDatabase();
  if (!database.accounts[key]) return;
  database.accounts[key].state = state;
  await saveLocalDatabase(database);
}
async function persistAccountState(key, state) {
  if (pool) {
    await pool.query("UPDATE accounts SET state = $2::jsonb WHERE account_key = $1", [key, JSON.stringify(state)]);
    return;
  }
  const database = await loadLocalDatabase();
  if (!database.accounts[key]) fail("Account nicht gefunden.", 404);
  database.accounts[key].state = state;
  await saveLocalDatabase(database);
}
async function allAccounts() {
  if (pool) {
    const result = await pool.query("SELECT id, username, created_at, password_salt, password_hash, state FROM accounts");
    return result.rows.map(accountFromRow);
  }
  const database = await loadLocalDatabase();
  return Object.values(database.accounts).map(normalizeAccount);
}
async function accountById(id) {
  if (pool) {
    const result = await pool.query(
      "SELECT id, username, created_at, password_salt, password_hash, state FROM accounts WHERE id = $1",
      [id],
    );
    return result.rows[0] ? accountFromRow(result.rows[0]) : null;
  }
  const database = await loadLocalDatabase();
  return normalizeAccount(Object.values(database.accounts).find((account) => account.id === id) || null);
}
function asWholeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}
function addStateLog(state, type, text) {
  state.log = [{ at: Date.now(), type, text }, ...(Array.isArray(state.log) ? state.log : [])].slice(0, 80);
}
function addNotification(state, kind, title, text, priority = "normal") {
  const notification = {
    id: `${Date.now()}-${randomBytes(4).toString("hex")}`,
    at: Date.now(), kind, title, text, priority,
  };
  state.notifications = [notification, ...(Array.isArray(state.notifications) ? state.notifications : [])].slice(0, 40);
  return notification;
}
function addCombatReport(state, report) {
  state.combatReports = [report, ...(Array.isArray(state.combatReports) ? state.combatReports : [])].slice(0, 40);
}
function addPlayerMessage(state, message) {
  state.messages = [message, ...(Array.isArray(state.messages) ? state.messages : [])].slice(0, 80);
}
function cleanMessageText(value, limit) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}
function hasTestGrantAccess(account) { return accountKey(account?.username) === accountKey(TEST_ACCOUNT_USERNAME); }
function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function primaryPlanet(account) {
  const planets = Array.isArray(account.state?.planets) ? account.state.planets : [];
  if (account.focusPlanet) return account.focusPlanet;
  return planets.find((planet) => planet.homeworld) || planets[0] || {};
}
function activeGalaxyAccount(account) {
  return { ...account, focusPlanet: account.state.planets.find((planet) => planet.id === account.state.activePlanetId) || primaryPlanet(account) };
}
function signalId(account) { return `${account.id}:${primaryPlanet(account).id}`; }
function galaxyPosition(account) {
  const planet = primaryPlanet(account);
  if (planet.position && Number.isFinite(Number(planet.position.x)) && Number.isFinite(Number(planet.position.y))) return { x: Number(planet.position.x), y: Number(planet.position.y) };
  const site = frontierSites.find(site => site.id === planet.id);
  if (site) {
    return { ...site.position };
  }
  const seed = stableHash(`${account.id}:${planet.id || "home"}`);
  return {
    x: 8 + seed % (GALAXY_SPAN - 16),
    y: 8 + Math.floor(seed / 211) % (GALAXY_SPAN - 16),
  };
}
function starterPosition(accounts, seedValue) {
  if (!accounts.length) {
    const seed = stableHash(seedValue);
    return { x: 20 + seed % (GALAXY_SPAN - 40), y: 20 + Math.floor(seed / 223) % (GALAXY_SPAN - 40) };
  }
  const anchor = galaxyPosition(accounts[stableHash(seedValue) % accounts.length]);
  const cellX = Math.floor(anchor.x / 16);
  const cellY = Math.floor(anchor.y / 16);
  const jitterX = (stableHash(`${seedValue}:x`) % 601) / 100 - 3;
  const jitterY = (stableHash(`${seedValue}:y`) % 601) / 100 - 3;
  return {
    x: Math.max(5, Math.min(GALAXY_SPAN - 5, Math.max(cellX * 16 + 2, Math.min(cellX * 16 + 14, anchor.x + jitterX)))),
    y: Math.max(5, Math.min(GALAXY_SPAN - 5, Math.max(cellY * 16 + 2, Math.min(cellY * 16 + 14, anchor.y + jitterY)))),
  };
}
function galaxyDistance(left, right) {
  return Math.round(Math.hypot(left.x - right.x, left.y - right.y) * 10) / 10;
}
const frontierSites = (() => {
  let seed = 732194;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; };
  const sites = [];
  for (let i=0;i<FRONTIER_SITE_COUNT;i++) {
    let position;
    for (let attempt=0;attempt<200;attempt++) {
      position = {x:4+random()*(GALAXY_SPAN-8),y:4+random()*(GALAXY_SPAN-8)};
      if (sites.every(s=>Math.hypot(s.position.x-position.x,s.position.y-position.y)>4)) break;
    }
    sites.push({id:`frontier-${i}`,signature:`Kepler ${i+1}`,position,free:true});
  }
  return sites;
})();
async function colonizeSite(key, targetId) {
  const site = frontierSites.find(site => site.id === targetId);
  if (!site) fail("Keine besiedelbare Welt.", 404);
  const apply = (account, accounts) => {
    if (accounts.some(a => a.state.planets.some(p => p.id === targetId))) fail("Diese Welt wurde bereits besiedelt.", 409);
    if (!positionIsVisible(account, site.position)) fail("Ziel außerhalb der Sichtweite.", 403);
    if (!asWholeNumber(account.state.ships.colonyShip)) fail("Ein Kolonieschiff ist erforderlich.", 400);
    if (account.state.planets.length >= MAX_PLANETS) fail(`Maximal ${MAX_PLANETS} Welten möglich.`, 400);
    const types = [["temperate","Gemäßigte Welt"],["arid","Wüstenwelt"],["ocean","Ozeanwelt"],["ice","Eiswelt"],["volcanic","Vulkanwelt"]];
    const [type, classification] = types[randomBytes(1)[0] % types.length];
    const planet = { id: site.id, name: randomWorldName(`${account.id}:${site.id}`), type, classification, fields: 96 + randomBytes(4).readUInt32BE() % 295, usedFields: 1, coordinates: `X ${site.position.x.toFixed(1)} · Y ${site.position.y.toFixed(1)}`, colonizedAt: Date.now(), homeworld: false, productionLoad: { metal: 100, crystal: 100, tritium: 100 } };
    planet.position = { ...site.position };
    planet.defenses = {};
    planet.buildings = freshBuildings(false);
    planet.buildingQueue = [];
    planet.shipQueue = null;
    account.state.ships.colonyShip -= 1;
    account.state.planets.push(planet);
    account.state.activePlanetId = planet.id;
    account.state.revision = asWholeNumber(account.state.revision) + 1;
    addStateLog(account.state, "mission", `${planet.name} besiedelt: ${planet.fields} Baufelder. Kolonieschiff verbraucht.`);
    return { state: account.state, planet };
  };
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(812901)");
      const current = await client.query("SELECT * FROM accounts WHERE account_key = $1 FOR UPDATE", [key]);
      const accounts = await client.query("SELECT * FROM accounts");
      const result = apply(accountFromRow(current.rows[0]), accounts.rows.map(accountFromRow));
      await client.query("UPDATE accounts SET state = $2::jsonb WHERE account_key = $1", [key, JSON.stringify(result.state)]);
      await client.query("COMMIT");
      return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  const database = await loadLocalDatabase();
  const result = apply(database.accounts[key], Object.values(database.accounts));
  await saveLocalDatabase(database);
  return result;
}
function sensorRange(account) {
  const level = asWholeNumber(account.state?.research?.deepSpaceSensors);
  return Math.min(340, 14 + level * 3.26);
}
function sensorOrigins(account) {
  return (account.state?.planets || []).map(planet => ({
    planetId: planet.id, name: String(planet.name || "Kolonie").slice(0, 36),
    position: galaxyPosition({ ...account, focusPlanet: planet }),
    radius: sensorRange(account), active: planet.id === account.state.activePlanetId,
    homeworld: Boolean(planet.homeworld),
  }));
}
function positionIsVisible(account, position) {
  return sensorOrigins(account).some(origin =>
    Math.hypot(origin.position.x - position.x, origin.position.y - position.y) <= origin.radius);
}
function targetIsVisible(attacker, defender) {
  return positionIsVisible(attacker, galaxyPosition(defender));
}
function knownSpyReport(state, targetId) {
  return (Array.isArray(state.spyReports) ? state.spyReports : []).find((report) => report.side !== "defender" && report.targetId === targetId) || null;
}
function publicGalaxyRecord(account, observer = null) {
  const planet = primaryPlanet(account);
  const position = galaxyPosition(account);
  return {
    id: signalId(account),
    signature: String(planet.name || "Unbenannte Signatur").slice(0, 36),
    owner: String(account.username || "Unbekannt").slice(0, 36),
    own: account.id === observer?.id,
    planetId: account.id === observer?.id ? planet.id : undefined,
    position,
    distance: observer ? galaxyDistance(galaxyPosition(observer), position) : null,
  };
}
function galaxySystems(contacts, observer) {
  const cellSize = 16;
  const orbitKey = contact => contact.id.includes(":frontier-") ? contact.id.slice(contact.id.indexOf(":") + 1) : contact.id;
  const buckets = new Map();
  for (const contact of contacts) {
    const cellX = Math.floor(Math.max(0, Math.min(GALAXY_SPAN - .001, contact.position.x)) / cellSize);
    const cellY = Math.floor(Math.max(0, Math.min(GALAXY_SPAN - .001, contact.position.y)) / cellSize);
    const key = `${cellX}-${cellY}`;
    if (!buckets.has(key)) buckets.set(key, { cellX, cellY, contacts: [] });
    buckets.get(key).contacts.push(contact);
  }
  const systems = [];
  for (const [key, bucket] of buckets) {
    const ordered = [...bucket.contacts].sort((a, b) => stableHash(orbitKey(a)) - stableHash(orbitKey(b)));
    for (let offset = 0; offset < ordered.length; offset += 13) {
      const chunk = ordered.slice(offset, offset + 13);
      const part = Math.floor(offset / 13);
      const systemKey = `${key}-${part}`;
      const seed = stableHash(`orbital-system:${systemKey}`);
      const jitterX = (seed % 801) / 100 - 4;
      const jitterY = (Math.floor(seed / 809) % 801) / 100 - 4;
      let position = {
        x: Math.max(3, Math.min(GALAXY_SPAN - 3, bucket.cellX * cellSize + cellSize / 2 + jitterX)),
        y: Math.max(3, Math.min(GALAXY_SPAN - 3, bucket.cellY * cellSize + cellSize / 2 + jitterY)),
      };
      const visible = chunk.filter(contact => contact.own || positionIsVisible(observer, contact.position));
      if (!visible.length) continue;
      if (!positionIsVisible(observer, position)) position = { ...visible[0].position };
      const slots = Array.from({ length: 13 }, (_, index) => ({ position: index + 1, empty: true }));
      for (const contact of chunk) {
        let index = stableHash(`orbit:${orbitKey(contact)}`) % 13;
        while (!slots[index].empty) index = (index + 1) % 13;
        slots[index] = {
          position: index + 1,
          targetId: contact.id,
          name: contact.signature,
          owner: contact.free ? null : contact.owner,
          free: Boolean(contact.free),
          own: Boolean(contact.own), planetId: contact.planetId,
          empty: false,
        };
      }
      for (let index = 0; index < slots.length; index++) {
        const slot = slots[index];
        if (!slot.empty && !visible.some(contact => contact.id === slot.targetId))
          slots[index] = { position: slot.position, empty: true, unexplored: true };
      }
      const occupiedCount = visible.filter(contact => !contact.free).length;
      const freeCount = visible.length - occupiedCount;
      systems.push({
        id: `system-${systemKey}`,
        signature: `Sektor ${String(100 + seed % 900).padStart(3, "0")}-${String.fromCharCode(65 + (Math.floor(seed / 997) % 26))}`,
        position,
        distance: galaxyDistance(galaxyPosition(observer), position),
        planetCount: visible.length,
        occupiedCount,
        freeCount,
        luminosity: Math.min(1, .34 + visible.length * .075),
        starSize: Math.min(38, 18 + visible.length * 2),
        slots,
      });
    }
  }
  return systems.sort((a, b) => a.distance - b.distance || a.signature.localeCompare(b.signature, "de"));
}
function spyReportFor(attacker, defender, probeCount) {
  if (!Number.isInteger(probeCount) || probeCount < 1 || probeCount > 12) fail("Wähle 1 bis 12 Sonden.");
  const probes = probeCount;
  const used = probes;
  const attackerSensors = asWholeNumber(attacker.state.research?.deepSpaceSensors);
  const defenderSensors = asWholeNumber(defender.state.research?.deepSpaceSensors);
  const defenses = primaryPlanet(defender).defenses || {};
  const jammer = Math.min(12, asWholeNumber(defenses.sensorJammer));
  const intelligence = Math.max(1, Math.min(5, 1 + Math.floor((attackerSensors - defenderSensors - jammer + Math.log2(used + 1) * 3) / 4)));
  const antiSpy = Object.entries(DEFENSE).reduce((sum,[key,item])=>sum+asWholeNumber(defenses[key])*item.antiSpy,0);
  const interceptionRisk = Math.max(.03, Math.min(.92, .08 + defenderSensors * .006 + antiSpy - Math.log2(used + 1) * .018));
  const lost = Math.random() < interceptionRisk ? Math.max(1, Math.floor(used * Math.min(.7, interceptionRisk + .12))) : 0;
  const planet = primaryPlanet(defender);
  const report = {
    id: `${defender.id}-${Date.now()}-${randomBytes(3).toString("hex")}`,
    targetId: signalId(defender),
    signature: String(planet.name || "Unbenannte Signatur").slice(0, 36),
    position: galaxyPosition(defender),
    createdAt: Date.now(),
    intelligence,
    probes: used,
    lost,
    risk: Math.round(interceptionRisk * 100),
    owner: intelligence >= 2 ? defender.username : null,
    world: intelligence >= 2 ? {
      classification: String(planet.classification || "Unbekannte Welt"),
      fields: Math.max(96, Math.min(390, asWholeNumber(planet.fields, 228))),
      usedFields: Math.max(0, asWholeNumber(planet.usedFields)),
    } : null,
    resources: intelligence >= 1 ? Object.fromEntries(RESOURCE_KEYS.map((key) => [key, asWholeNumber(planet.resources?.[key])])) : null,
    ships: intelligence >= 3 ? Object.fromEntries(Object.entries(defender.state.ships || {}).map(([key, value]) => [key, asWholeNumber(value)])) : null,
    buildings: intelligence >= 4 ? Object.fromEntries(Object.entries(planet.buildings || defender.state.buildings || {}).map(([key, value]) => [key, asWholeNumber(value)])) : null,
    research: intelligence >= 5 ? Object.fromEntries(Object.entries(defender.state.research || {}).map(([key, value]) => [key, asWholeNumber(value)])) : null,
    defenses: intelligence >= 4 ? Object.fromEntries(Object.keys(DEFENSE).map(key=>[key,asWholeNumber(defenses[key])])) : null,
    activeMissions: intelligence >= 5 ? asWholeNumber(defender.state.missions?.length) : null,
  };
  attacker.state.spyReports = [report, ...(Array.isArray(attacker.state.spyReports) ? attacker.state.spyReports : [])].slice(0, 40);
  addStateLog(attacker.state, "scan", `Aufklärung von ${report.signature} abgeschlossen. Informationsstufe ${intelligence}/5${lost ? ` · ${lost} Sonde verloren` : ""}.`);
  addNotification(attacker.state, "scan", "Spionagebericht eingetroffen", `${report.signature}: Detailstufe ${intelligence}/5 · ${used} Sonde${used === 1 ? "" : "n"} eingesetzt${lost ? ` · ${lost} verloren` : ""}.`, intelligence >= 4 ? "high" : "normal");
  const source = defenderSensors >= 3 ? `Signatur von ${attacker.username}` : "Unbekannte Signatur";
  defender.state.spyReports = [{
    id: `${report.id}-defender`, side: "defender", createdAt: report.createdAt,
    signature: String(planet.name || "Unbekannte Welt"), attackerName: defenderSensors >= 3 ? attacker.username : null,
    probes: used, intercepted: lost, targetId: signalId(defender),
  }, ...(Array.isArray(defender.state.spyReports) ? defender.state.spyReports : [])].slice(0, 40);
  addStateLog(defender.state, "scan", `${source} hat ${planet.name || "eine Welt"} ausgespäht.`);
  addNotification(defender.state, "scan", "Spionagealarm", `${source} hat ${planet.name || "deinen Planeten"} aufgeklärt. Prüfe Lager, Flotte und Verteidigung.`, "high");
  return report;
}
function prepareRaid(attacker, defender, rawFleet) {
  const fleet = Object.fromEntries(Object.keys(FLEET).map(key=>[key,asWholeNumber(rawFleet?.[key])]));
  const attackerAvionics = asWholeNumber(attacker.state.research?.avionics);
  const defenderAvionics = asWholeNumber(defender.state.research?.avionics);
  const defenderShips = defender.state.ships || {};
  const defenderBuildings = primaryPlanet(defender).buildings || defender.state.buildings || {};
  const planetDefenses = primaryPlanet(defender).defenses || {};
  const { attackPower, defensePower, won, capacity, losses, defenseLosses, survivors } = simulateBattle({ attackerFleet:fleet, defenderFleet:defenderShips, defenses:planetDefenses, attackerAvionics, defenderAvionics, commandCenter:defenderBuildings.commandCenter, shipyard:defenderBuildings.shipyard });
  const loot = { metal: 0, crystal: 0, tritium: 0 };
  if (won) {
    let remainingCapacity = capacity;
    for (const resource of RESOURCE_KEYS) {
      const stock = primaryPlanet(defender).resources || defender.state.resources;
      const available = asWholeNumber(stock[resource]);
      const amount = Math.min(available, Math.floor(available * 0.15), remainingCapacity);
      loot[resource] = amount;
      remainingCapacity -= amount;
      stock[resource] = available - amount;
    }
  }
  if (won) for (const key of Object.keys(DEFENSE)) {
    planetDefenses[key] = asWholeNumber(planetDefenses[key]) - defenseLosses[key];
  }
  const lootText = RESOURCE_KEYS.filter((key) => loot[key]).map((key) => `${loot[key]} ${key}`).join(", ") || "keine Beute";
  addStateLog(attacker.state, won ? "mission" : "combat", won
    ? `Raubzug gegen ${defender.username} erfolgreich. Erbeutet: ${lootText}.`
    : `Raubzug gegen ${defender.username} abgewehrt. Teile der Flotte gingen verloren.`);
  addStateLog(defender.state, won ? "combat" : "mission", won
    ? `${attacker.username} hat einen Raubzug geflogen und ${lootText} entwendet.`
    : `${attacker.username} hat einen Raubzug geflogen, aber deine Verteidigung hielt stand.`);
  const attackerLosses = Object.entries(losses).filter(([, amount]) => amount).map(([key, amount]) => `${amount} ${FLEET[key].name || key}`).join(", ") || "keine";
  const defenseLossText = Object.entries(defenseLosses).filter(([, amount]) => amount).map(([key, amount]) => `${amount} ${DEFENSE[key].name}`).join(", ") || "keine";
  addNotification(attacker.state, "combat", won ? "Kampfbericht: Sieg" : "Kampfbericht: Einsatz verloren", won
    ? `Beute: ${lootText}. Eigene Verluste: ${attackerLosses}.`
    : `Deine Flotte wurde abgewehrt. Eigene Verluste: ${attackerLosses}.`, won ? "normal" : "high");
  addNotification(defender.state, "combat", won ? "Angriffsalarm: Ressourcen entwendet" : "Angriff abgefangen", won
    ? `${attacker.username} hat ${lootText} erbeutet. Beschädigte Abwehr: ${defenseLossText}.`
    : `${attacker.username} wurde abgefangen. Deine Verteidigung hielt stand.`, "high");
  const resolvedAt = Date.now();
  const combatId = `${attacker.id}-${defender.id}-${resolvedAt}-${randomBytes(3).toString("hex")}`;
  addCombatReport(attacker.state, { id: combatId, at: resolvedAt, side: "attacker", opponent: defender.username, won, loot, attackPower, defensePower, losses, defenseLosses, attackerLosses, defenseLossSummary: defenseLossText });
  addCombatReport(defender.state, { id: combatId, at: resolvedAt, side: "defender", opponent: attacker.username, won: !won, loot, attackPower, defensePower, losses: {}, defenseLosses, attackerLosses, defenseLossSummary: defenseLossText });
  return { won, fleet, survivors, loot, attackPower, defensePower, losses, defenseLosses, attackerLosses, defenseLossSummary: defenseLossText, resolvedAt };
}
export function flightDuration(attacker, defender, spy, at = Date.now()) {
  const distance = galaxyDistance(galaxyPosition(attacker), galaxyPosition(defender));
  const drive = asWholeNumber(attacker.state.research?.combustionDrive);
  const speed = worldSpeedAt(at);
  const minimum = speed === 1 ? (spy ? 120000 : 240000) : (spy ? 60000 : 180000);
  return Math.round(Math.max(minimum, ((spy ? 180000 : 360000) + distance * 10000) / ((1 + drive * .12) * speed)));
}
function launchPvpAction(attacker, defender, targetPlanetId, rawFleet, spy) {
  normalizeAccount(attacker); normalizeAccount(defender);
  const targetPlanet = defender.state.planets.find(planet => planet.id === targetPlanetId);
  if (!targetPlanet) fail("Dieses Ziel ist nicht verfügbar.", 404);
  const origin = activeGalaxyAccount(attacker);
  const target = { ...defender, focusPlanet: targetPlanet };
  const report = spy ? null : knownSpyReport(attacker.state, signalId(target));
  if (!targetIsVisible(origin, target) && !report) fail("Dieses Ziel ist nicht verfügbar.", 404);
  if ((attacker.state.pvpFlights || []).length >= 20) fail("Maximal 20 PvP-Flüge gleichzeitig.", 409);
  let fleet;
  if (spy) {
    const probes = Number(rawFleet?.probes);
    if (!Number.isInteger(probes) || probes < 1 || probes > 12) fail("Wähle 1 bis 12 Sonden.");
    if (Date.now() - Number(attacker.state.lastSpyAt || 0) < 15000) fail("Sondenkanal belegt. Bitte 15 Sekunden zwischen Scans warten.", 429);
    fleet = { spyProbe: probes };
    attacker.state.lastSpyAt = Date.now();
  } else {
    if (!report) fail("Klär das Ziel zuerst mit Sonden auf.", 409);
    fleet = Object.fromEntries(Object.keys(FLEET).map(key => [key, asWholeNumber(rawFleet?.[key])]));
    if (!Object.values(fleet).some(Boolean)) fail("Wähle mindestens ein Transport- oder Kampfschiff.");
  }
  for (const [key, amount] of Object.entries(fleet)) {
    if (amount > asWholeNumber(attacker.state.ships?.[key])) fail("Nicht genügend Schiffe vorhanden.");
  }
  for (const [key, amount] of Object.entries(fleet)) attacker.state.ships[key] = asWholeNumber(attacker.state.ships[key]) - amount;
  const now = Date.now(), duration = flightDuration(origin, target, spy);
  const flight = {
    id: randomBytes(12).toString("hex"), kind: spy ? "spy" : "raid", phase: "outgoing",
    attackerId: attacker.id, defenderId: defender.id, sourcePlanetId: primaryPlanet(origin).id,
    sourceName: primaryPlanet(origin).name, targetPlanetId, targetName: targetPlanet.name,
    attackerName: attacker.username, defenderName: defender.username, fleet,
    departedAt: now, arrivesAt: now + duration, returnAt: now + duration * 2, duration,
  };
  attacker.state.pvpFlights = [...(attacker.state.pvpFlights || []), flight];
  defender.state.incomingFlights = [...(defender.state.incomingFlights || []), {
    id: flight.id, kind: flight.kind, attackerName: attacker.username, targetPlanetId,
    targetName: targetPlanet.name, arrivesAt: flight.arrivesAt, departedAt: now,
  }];
  addStateLog(attacker.state, spy ? "scan" : "mission", `${spy ? "Sonden" : "Angriffsflotte"} unterwegs zu ${targetPlanet.name}. Ankunft ${new Date(flight.arrivesAt).toLocaleTimeString("de-DE")}.`);
  attacker.state.revision = asWholeNumber(attacker.state.revision) + 1;
  defender.state.revision = asWholeNumber(defender.state.revision) + 1;
  return flight;
}
async function executeRaid(attackerKey, targetId, rawFleet, spy = false) {
  const separator = targetId.indexOf(":");
  if (separator < 0) fail("Bitte das Ziel erneut auf der Karte auswählen.");
  const defenderId = targetId.slice(0, separator), targetPlanetId = targetId.slice(separator + 1);
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT id, account_key, username, created_at, password_salt, password_hash, state FROM accounts WHERE account_key = $1 OR id = $2 ORDER BY id FOR UPDATE", [attackerKey, defenderId]);
      const attackerRow = result.rows.find(row => row.account_key === attackerKey);
      const defenderRow = result.rows.find(row => row.id === defenderId);
      if (!attackerRow || !defenderRow || attackerRow.id === defenderRow.id) fail("Dieses Ziel ist nicht verfügbar.", 404);
      const attacker = accountFromRow(attackerRow), defender = accountFromRow(defenderRow);
      const flight = launchPvpAction(attacker, defender, targetPlanetId, rawFleet, spy);
      await client.query("UPDATE accounts SET state = $2::jsonb WHERE id = $1", [attacker.id, JSON.stringify(attacker.state)]);
      await client.query("UPDATE accounts SET state = $2::jsonb WHERE id = $1", [defender.id, JSON.stringify(defender.state)]);
      await client.query("COMMIT");
      return { state: attacker.state, flight };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  const database = await loadLocalDatabase();
  const attacker = database.accounts[attackerKey];
  const defender = Object.values(database.accounts).find(account => account.id === defenderId);
  if (!attacker || !defender || attacker.id === defender.id) fail("Dieses Ziel ist nicht verfügbar.", 404);
  const flight = launchPvpAction(attacker, defender, targetPlanetId, rawFleet, spy);
  await saveLocalDatabase(database);
  return { state: attacker.state, flight };
}
function settlePvpFlight(attacker, defender, flightId, now) {
  normalizeAccount(attacker); normalizeAccount(defender);
  const flight = (attacker.state.pvpFlights || []).find(item => item.id === flightId);
  if (!flight) return false;
  if (flight.phase === "outgoing" && flight.arrivesAt <= now) {
    const targetPlanet = defender.state.planets.find(planet => planet.id === flight.targetPlanetId);
    if (targetPlanet) {
      const target = { ...defender, focusPlanet: targetPlanet };
      if (flight.kind === "spy") {
        const report = spyReportFor(attacker, target, flight.fleet.spyProbe);
        flight.survivors = { spyProbe: Math.max(0, flight.fleet.spyProbe - report.lost) };
      } else {
        const result = prepareRaid(attacker, target, flight.fleet);
        flight.survivors = result.survivors;
        flight.loot = result.loot;
      }
    } else {
      flight.survivors = flight.fleet;
      addStateLog(attacker.state, "mission", "Zielwelt nicht mehr vorhanden. Flotte kehrt zurück.");
    }
    flight.phase = "returning";
    flight.returnAt = now + flight.duration;
    defender.state.incomingFlights = (defender.state.incomingFlights || []).filter(item => item.id !== flight.id);
    defender.state.revision = asWholeNumber(defender.state.revision) + 1;
  } else if (flight.phase === "returning" && flight.returnAt <= now) {
    for (const [key, amount] of Object.entries(flight.survivors || {}))
      attacker.state.ships[key] = asWholeNumber(attacker.state.ships?.[key]) + asWholeNumber(amount);
    const source = attacker.state.planets.find(planet => planet.id === flight.sourcePlanetId) || primaryPlanet(attacker);
    source.resources ??= { metal: 0, crystal: 0, tritium: 0, lastUpdate: now };
    for (const key of RESOURCE_KEYS) source.resources[key] = asWholeNumber(source.resources[key]) + asWholeNumber(flight.loot?.[key]);
    attacker.state.pvpFlights = attacker.state.pvpFlights.filter(item => item.id !== flight.id);
    addStateLog(attacker.state, "mission", `${flight.kind === "spy" ? "Sonden" : "Angriffsflotte"} von ${flight.targetName} zurückgekehrt.`);
  } else return false;
  attacker.state.revision = asWholeNumber(attacker.state.revision) + 1;
  return true;
}
async function resolveOnePvpFlight(attackerId, defenderId, flightId, now) {
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT id, account_key, username, created_at, password_salt, password_hash, state FROM accounts WHERE id = $1 OR id = $2 ORDER BY id FOR UPDATE", [attackerId, defenderId]);
      const attackerRow = result.rows.find(row => row.id === attackerId), defenderRow = result.rows.find(row => row.id === defenderId);
      if (!attackerRow || !defenderRow) { await client.query("ROLLBACK"); return; }
      const attacker = accountFromRow(attackerRow), defender = accountFromRow(defenderRow);
      if (settlePvpFlight(attacker, defender, flightId, now)) {
        await client.query("UPDATE accounts SET state = $2::jsonb WHERE id = $1", [attackerId, JSON.stringify(attacker.state)]);
        await client.query("UPDATE accounts SET state = $2::jsonb WHERE id = $1", [defenderId, JSON.stringify(defender.state)]);
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } else {
    const database = await loadLocalDatabase();
    const attacker = Object.values(database.accounts).find(account => account.id === attackerId);
    const defender = Object.values(database.accounts).find(account => account.id === defenderId);
    if (attacker && defender && settlePvpFlight(attacker, defender, flightId, now)) await saveLocalDatabase(database);
  }
}
async function resolveDuePvpFlights(now = Date.now()) {
  // Only accounts with pending flights are loaded from Neon. Idle services make no periodic DB calls.
  const accounts = pool ? (await pool.query("SELECT id, state FROM accounts WHERE CASE WHEN jsonb_typeof(state->'pvpFlights') = 'array' THEN jsonb_array_length(state->'pvpFlights') ELSE 0 END > 0")).rows : await allAccounts();
  for (const attacker of accounts) for (const flight of attacker.state.pvpFlights || [])
    if ((flight.phase === "outgoing" ? flight.arrivesAt : flight.returnAt) <= now)
      await resolveOnePvpFlight(attacker.id, flight.defenderId, flight.id, now);
}
let lastFlightSweep = 0;
async function sweepFlights() {
  if (Date.now() - lastFlightSweep < 5000) return;
  lastFlightSweep = Date.now();
  await mutate(resolveDuePvpFlights);
}
async function sendPlayerMessage(senderKey, recipientName, rawSubject, rawBody) {
  const recipientKey = accountKey(recipientName);
  const subject = cleanMessageText(rawSubject, 72);
  const body = cleanMessageText(rawBody, 1200);
  if (!recipientKey || !subject || !body) fail("Empfänger, Betreff und Nachricht sind erforderlich.");
  if (recipientKey === senderKey) fail("Du kannst dir nicht selbst schreiben.");
  const apply = (sender, recipient) => {
    const sentAt = Date.now();
    const id = `${sender.id}-${recipient.id}-${sentAt}-${randomBytes(3).toString("hex")}`;
    const threadId = [sender.id, recipient.id].sort().join(":");
    const admin = hasTestGrantAccess(sender);
    addPlayerMessage(sender.state, { id, threadId, at: sentAt, direction: "outbound", sender: sender.username, recipient: recipient.username, subject, body, admin, read: true });
    addPlayerMessage(recipient.state, { id, threadId, at: sentAt, direction: "inbound", sender: sender.username, recipient: recipient.username, subject, body, admin, read: false });
    addNotification(recipient.state, "message", "Neue Direktnachricht", `${sender.username}: ${subject}`, "high");
    addStateLog(sender.state, "message", `Nachricht an ${recipient.username} gesendet: ${subject}`);
    addStateLog(recipient.state, "message", `Neue Nachricht von ${sender.username}: ${subject}`);
    sender.state.revision = asWholeNumber(sender.state.revision) + 1;
    recipient.state.revision = asWholeNumber(recipient.state.revision) + 1;
    return { state: sender.state, message: sender.state.messages[0] };
  };
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT id, account_key, username, created_at, password_salt, password_hash, state FROM accounts WHERE account_key = $1 OR account_key = $2 ORDER BY account_key FOR UPDATE", [senderKey, recipientKey]);
      const senderRow = result.rows.find((row) => row.account_key === senderKey);
      const recipientRow = result.rows.find((row) => row.account_key === recipientKey);
      if (!senderRow || !recipientRow) fail("Kommandant nicht gefunden.", 404);
      const sender = accountFromRow(senderRow);
      const recipient = accountFromRow(recipientRow);
      const outcome = apply(sender, recipient);
      await client.query("UPDATE accounts SET state = $2::jsonb WHERE account_key = $1", [senderKey, JSON.stringify(sender.state)]);
      await client.query("UPDATE accounts SET state = $2::jsonb WHERE account_key = $1", [recipientKey, JSON.stringify(recipient.state)]);
      await client.query("COMMIT");
      return outcome;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  const database = await loadLocalDatabase();
  const sender = database.accounts[senderKey];
  const recipient = database.accounts[recipientKey];
  if (!sender || !recipient) fail("Kommandant nicht gefunden.", 404);
  const outcome = apply(sender, recipient);
  database.accounts[senderKey] = sender;
  database.accounts[recipientKey] = recipient;
  await saveLocalDatabase(database);
  return outcome;
}
async function makePasswordRecord(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = await scrypt(password, salt, 64);
  return { salt, hash: Buffer.from(hash).toString("base64url") };
}
async function passwordMatches(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const expected = Buffer.from(record.hash, "base64url");
  const actual = Buffer.from(await scrypt(password, record.salt, 64));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? [] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter((entry) => entry.length));
}
function activeSession(request) {
  const id = parseCookies(request.headers.cookie).of_session;
  const session = id && sessions.get(id);
  if (!session || session.expiresAt <= Date.now()) {
    if (id) sessions.delete(id);
    return null;
  }
  return { id, ...session };
}
function issueSession(response, key) {
  const id = randomBytes(32).toString("base64url");
  sessions.set(id, { key, expiresAt: Date.now() + sessionLifetime });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader("Set-Cookie", `of_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(sessionLifetime / 1000)}${secure}`);
}
function clearSession(request, response) {
  const id = parseCookies(request.headers.cookie).of_session;
  if (id) sessions.delete(id);
  response.setHeader("Set-Cookie", "of_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}
function publicAccount(account) { return { username: account.username, createdAt: account.createdAt }; }
function score(player) {
  const planetBuildings = (player.planets || []).flatMap((planet) => Object.values(planet.buildings || {}));
  const values = [...(planetBuildings.length ? planetBuildings : Object.values(player.buildings || {})), ...Object.values(player.research || {})];
  const fleet = Object.values(player.ships || {}).reduce((sum, count) => sum + Number(count || 0) * 4, 0);
  return Math.floor(values.reduce((sum, level) => sum + Number(level || 0) ** 2 * 12, 0) + fleet);
}
function isSafeState(state) {
  return Boolean(state && typeof state === "object" && state.resources && typeof state.resources === "object" &&
    state.buildings && typeof state.buildings === "object" && state.research && typeof state.research === "object" &&
    state.ships && typeof state.ships === "object" && state.queues && typeof state.queues === "object" &&
    Array.isArray(state.planets) && Array.isArray(state.missions) && Array.isArray(state.log));
}
function saveableState(rawState, username) {
  if (!isSafeState(rawState)) return null;
  const state = structuredClone(rawState);
  if ((state.queues.research ? 1 : 0) + (state.queues.researchWaiting?.length || 0) > 5 ||
      state.planets.some(p => (p.buildingQueue?.length || 0) > 5 || (p.shipQueue ? 1 : 0) + (p.shipWaiting?.length || 0) > 5)) {
    fail("Maximal fünf Aufträge je Warteschlange, einschließlich laufendem Auftrag.", 400);
  }
  state.version = 4;
  state.commander = username;
  for (const group of [state.buildings, state.research]) {
    for (const key of Object.keys(group)) group[key] = Math.min(LEVEL_CAP, asWholeNumber(group[key]));
  }
  const legacyBuildings = { ...state.buildings };
  state.planets = state.planets.slice(0, MAX_PLANETS).map((planet, index) => {
    const buildings = { ...(planet.buildings || (planet.homeworld || index === 0 ? legacyBuildings : freshBuildings(false))) };
    for (const key of Object.keys(freshBuildings(false))) buildings[key] = Math.min(LEVEL_CAP, asWholeNumber(buildings[key]));
    return {
      ...planet,
      name: cleanPlanetName(planet.name) || randomWorldName(`${username}:${planet.id || index}`),
      productionLoad: Object.fromEntries(RESOURCE_KEYS.map((key) => {
        const value = Number(planet.productionLoad?.[key]);
        return [key, Number.isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value / 10) * 10)) : 100];
      })),
      buildings,
      buildingQueue: Array.isArray(planet.buildingQueue) ? planet.buildingQueue : [],
      shipQueue: planet.shipQueue || null,
      usedFields: Object.values(buildings).reduce((sum, level) => sum + asWholeNumber(level), 0),
    };
  });
  const homeworld = state.planets.find((planet) => planet.homeworld) || state.planets[0];
  state.buildings = { ...(homeworld?.buildings || legacyBuildings) };
  for (const resource of RESOURCE_KEYS) state.resources[resource] = Math.min(Number.MAX_SAFE_INTEGER, asWholeNumber(state.resources[resource]));
  for (const planet of state.planets) if (planet.resources) {
    for (const resource of RESOURCE_KEYS) planet.resources[resource] = Math.min(Number.MAX_SAFE_INTEGER, asWholeNumber(planet.resources[resource]));
  }
  state.log = state.log.slice(0, 80);
  state.spyReports = Array.isArray(state.spyReports) ? state.spyReports.slice(0, 40) : [];
  state.combatReports = Array.isArray(state.combatReports) ? state.combatReports.slice(0, 40) : [];
  state.messages = Array.isArray(state.messages) ? state.messages.slice(0, 80) : [];
  state.notifications = Array.isArray(state.notifications) ? state.notifications.slice(0, 40) : [];
  state.missions = state.missions.slice(0, 20);
  return state;
}
function json(response, status, payload, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...headers });
  response.end(JSON.stringify(payload));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 500_000) request.destroy(new Error("Payload too large"));
    });
    request.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("Invalid JSON")); } });
    request.on("error", reject);
  });
}
async function authenticatedAccount(request) {
  const session = activeSession(request);
  if (!session) return null;
  const account = await accountByKey(session.key);
  return account ? { account, key: session.key } : null;
}
async function serveStatic(pathname, request, response) {
  const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = normalize(join(publicRoot, requested));
  if (!filePath.startsWith(`${publicRoot}${sep}`) && filePath !== join(publicRoot, "index.html")) return json(response, 403, { error: "Forbidden" });
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return json(response, 404, { error: "Not found" });
    const etag = `W/"${info.size}-${Math.floor(info.mtimeMs)}"`;
    const baseHeaders = {
      "Cache-Control": requested === "index.html" ? "no-cache" : "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-src https://www.youtube.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "Cross-Origin-Resource-Policy": "same-origin",
      "ETag": etag,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    };
    if (request.headers["if-none-match"] === etag) {
      response.writeHead(304, baseHeaders);
      return response.end();
    }
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream", ...baseHeaders });
    createReadStream(filePath).pipe(response);
  } catch { json(response, 404, { error: "Not found" }); }
}

function demoAccount(activeId = "demo-home") {
  const state = defaultState("Demo Commander", {x:45,y:65});
  state.buildBoostFrom = 0;
  state.buildBoostUntil = 0;
  const base = structuredClone(state.planets[0]);
  state.planets = [
    {...structuredClone(base),id:"demo-home",name:"Aster Prime",homeworld:true,position:{x:45,y:65},type:"temperate"},
    {...structuredClone(base),id:"demo-colony",name:"Helios Outpost",homeworld:false,position:{x:95,y:85},type:"arid"},
    {...structuredClone(base),id:"demo-third",name:"Nereid Haven",homeworld:false,position:{x:140,y:135},type:"ocean"},
  ];
  state.activePlanetId = state.planets.some(p=>p.id===activeId)?activeId:"demo-home";
  for(const planet of state.planets){planet.resources={metal:18500,crystal:8200,tritium:4600};}
  state.resources=state.planets.find(p=>p.id===state.activePlanetId).resources;
  state.research.deepSpaceSensors=3; state.ships.smallTransport=4; state.ships.interceptor=3;
  const now=Date.now();
  state.missions=[
    {id:"demo-transport",kind:"transport",sourcePlanetId:"demo-home",destinationPlanetId:"demo-colony",departedAt:now-30000,arrivesAt:now+90000,duration:120000,phase:"outgoing",fleet:{smallTransport:2},cargo:{metal:2500,crystal:1200,tritium:600}},
    {id:"demo-return",kind:"transport",sourcePlanetId:"demo-home",destinationPlanetId:"demo-third",departedAt:now-150000,arrivesAt:now-30000,returnAt:now+90000,duration:120000,phase:"returning",fleet:{smallTransport:1},cargo:{}},
  ];
  return {id:"demo",username:"Demo Commander",state};
}
const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    await storageReady;
    if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/demo") && url.pathname !== "/api/locale") await sweepFlights();
    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, { ok: true, storage: pool ? "postgres" : "file" });
    }
    if (request.method === "GET" && url.pathname === "/api/locale") {
      response.setHeader("Cache-Control", "private, no-store");
      return json(response, 200, requestLocale(request));
    }
    if (request.method === "GET" && url.pathname === "/api/demo") {
      return json(response,200,{demo:true,user:{username:"Demo Commander"},state:demoAccount().state,capabilities:{testGrant:false}});
    }
    if (request.method === "GET" && url.pathname === "/api/demo/galaxy") {
      const observer=activeGalaxyAccount(demoAccount(url.searchParams.get("planet")));
      const own=observer.state.planets.map(focusPlanet=>publicGalaxyRecord({...observer,focusPlanet},observer));
      const contacts=[...own,...frontierSites.map(site=>({...site,distance:galaxyDistance(galaxyPosition(observer),site.position)}))];
      return json(response,200,{demo:true,contacts:contacts.filter(contact=>contact.own||positionIsVisible(observer,contact.position)),systems:galaxySystems(contacts,observer),sensorOrigins:sensorOrigins(observer),origin:galaxyPosition(observer),radius:sensorRange(observer),span:GALAXY_SPAN,updatedAt:Date.now()});
    }
    if (request.method === "POST" && url.pathname === "/api/auth/register") {
      const body = await readBody(request);
      const username = cleanUsername(body.username);
      const password = cleanPassword(body.password);
      if (!username) return json(response, 400, { error: "Der Kommandantenname braucht 3–20 Zeichen." });
      if (!password) return json(response, 400, { error: "Das Passwort braucht mindestens 8 Zeichen." });
      const key = accountKey(username);
      if (await accountByKey(key)) return json(response, 409, { error: "Dieser Kommandantenname ist bereits vergeben." });
      const id = randomBytes(12).toString("hex");
      const account = { id, username, createdAt: Date.now(), password: await makePasswordRecord(password), state: defaultState(username, starterPosition(await allAccounts(), id)) };
      try {
      await mutate(() => createAccount(key, account));
      } catch (error) {
        if (error?.code === "23505") return json(response, 409, { error: "Dieser Kommandantenname ist bereits vergeben." });
        throw error;
      }
      issueSession(response, key);
      return json(response, 201, { user: publicAccount(account), state: account.state, capabilities: { testGrant: hasTestGrantAccess(account) } });
    }
    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await readBody(request);
      const username = cleanUsername(body.username);
      const password = String(body.password || "");
      const key = username && accountKey(username);
      const account = key && await accountByKey(key);
      if (!account || !(await passwordMatches(password, account.password))) return json(response, 401, { error: "Name oder Passwort ist nicht korrekt." });
      issueSession(response, key);
      return json(response, 200, { user: publicAccount(account), state: account.state, capabilities: { testGrant: hasTestGrantAccess(account) } });
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      clearSession(request, response);
      return json(response, 200, { ok: true });
    }
    if (request.method === "GET" && url.pathname === "/api/session") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "No active session" });
      return json(response, 200, { user: publicAccount(current.account), state: current.account.state, capabilities: { testGrant: hasTestGrantAccess(current.account) } });
    }
    if (request.method === "GET" && url.pathname === "/api/state") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      return json(response, 200, { state: current.account.state });
    }
    if (request.method === "PUT" && url.pathname === "/api/state") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const body = await readBody(request);
      const state = saveableState(body.state, current.account.username);
      if (!state) return json(response, 400, { error: "Ungültiger Spielstand" });
      await mutate(() => updateAccountState(current.key, state));
      return json(response, 200, { ok: true, revision: state.revision, savedAt: Date.now() });
    }
    if (request.method === "GET" && url.pathname === "/api/players") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const query = cleanUsername(url.searchParams.get("q") || "").toLocaleLowerCase("de-DE");
      const players = (await allAccounts())
        .filter((account) => !query || account.username.toLocaleLowerCase("de-DE").includes(query))
        .map((account) => ({ username: account.username, self: account.id === current.account.id, score: score(account.state), planets: account.state.planets?.length || 1 }))
        .sort((a, b) => Number(b.self)-Number(a.self) || b.score - a.score || a.username.localeCompare(b.username, "de")).slice(0, 20);
      return json(response, 200, { players });
    }
    if (request.method === "POST" && url.pathname === "/api/planets/rename") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const body = await readBody(request);
      const planetId = String(body.planetId || "");
      const name = cleanPlanetName(body.name);
      if (!name || name.length < 3) return json(response, 400, { error: "Der Planetenname braucht 3–28 Zeichen." });
      const state = await mutate(async () => {
        const account = await accountByKey(current.key);
        const planet = account.state.planets.find((entry) => entry.id === planetId);
        if (!planet) fail("Planet nicht gefunden.", 404);
        planet.name = name;
        account.state.revision = asWholeNumber(account.state.revision) + 1;
        addStateLog(account.state, "system", `Planet umbenannt: ${name}.`);
        await persistAccountState(current.key, account.state);
        return account.state;
      });
      return json(response, 200, { state });
    }
    if (request.method === "POST" && url.pathname === "/api/test/grant-boost") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response,401,{error:"Anmeldung erforderlich"});
      if (accountKey(current.account.username) !== accountKey("Lord Fredo")) return json(response,403,{error:"Nur Lord Fredo darf Bauboosts vergeben."});
      const body = await readBody(request);
      const username = cleanUsername(body.username);
      if (!username) return json(response,400,{error:"Spielername erforderlich."});
      const result = await mutate(async()=>{
        const key=accountKey(username), account=await accountByKey(key);
        if (!account) fail("Account nicht gefunden.",404);
        applyBuildBoost(account.state,Date.now());
        account.state.revision=asWholeNumber(account.state.revision)+1;
        addNotification(account.state,"system","Bauboost aktiviert","Lord Fredo hat dir 60 Minuten 20-faches Bautempo geschenkt. Gilt für Gebäude, Forschung und Schiffe. Erneutes Vergeben erneuert die 60 Minuten.");
        await persistAccountState(key,account.state);
        return {username:account.username,until:account.state.buildBoostUntil,...(key===current.key?{state:account.state}:{})};
      });
      return json(response,200,{ok:true,...result});
    }
    if (request.method === "POST" && url.pathname === "/api/test/grant-resources") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      if (!hasTestGrantAccess(current.account)) return json(response, 403, { error: "Diese Testfunktion ist für diesen Account nicht verfügbar." });
      const body = await readBody(request);
      const username = cleanUsername(body.username);
      if (!username) return json(response, 400, { error: "Spielername erforderlich." });
      const result = await mutate(async () => {
        const key = accountKey(username);
        const account = await accountByKey(key);
        if (!account) fail("Account nicht gefunden.", 404);
        for (const resource of RESOURCE_KEYS) account.state.resources[resource] = Math.min(Number.MAX_SAFE_INTEGER, asWholeNumber(account.state.resources?.[resource]) + 50_000);
        account.state.revision = asWholeNumber(account.state.revision) + 1;
        addStateLog(account.state, "system", "Testlieferung: +50.000 Metall, Kristall und Tritium.");
        addNotification(account.state, "system", "Testlieferung eingetroffen", `${current.account.username} hat dir 50.000 Einheiten jeder Ressource gesendet.`);
        await persistAccountState(key, account.state);
        return { username: account.username, ...(key===current.key?{state:account.state}:{}) };
      });
      return json(response, 200, { ok: true, ...result });
    }
    if (request.method === "POST" && url.pathname === "/api/messages") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const body = await readBody(request);
      return json(response, 201, await mutate(() => sendPlayerMessage(current.key, cleanUsername(body.recipient), body.subject, body.body)));
    }
    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      const ranking = (await allAccounts()).map((account) => ({
        commander: account.username, score: score(account.state), planets: account.state.planets?.length || 1,
      })).sort((a, b) => b.score - a.score || a.commander.localeCompare(b.commander, "de"));
      return json(response, 200, ranking);
    }
    if (request.method === "POST" && url.pathname === "/api/admin/grant-resources") {
      const token = String(request.headers["x-admin-token"] || "");
      if (!process.env.ADMIN_GRANT_TOKEN || token !== process.env.ADMIN_GRANT_TOKEN) return json(response, 401, { error: "Nicht autorisiert" });
      const body = await readBody(request);
      const usernames = Array.isArray(body.usernames) ? body.usernames.map(cleanUsername).filter(Boolean) : [];
      const amount = Math.min(1_000_000, asWholeNumber(body.amount));
      if (!usernames.length || !amount) return json(response, 400, { error: "Nutzer und Betrag sind erforderlich." });
      const credits = await mutate(async () => {
        const results = [];
        for (const username of [...new Set(usernames)]) {
          const key = accountKey(username);
          const account = await accountByKey(key);
          if (!account) fail(`Account nicht gefunden: ${username}`, 404);
          for (const resource of RESOURCE_KEYS) account.state.resources[resource] = Math.min(Number.MAX_SAFE_INTEGER, asWholeNumber(account.state.resources?.[resource]) + amount);
          account.state.revision = asWholeNumber(account.state.revision) + 1;
          addStateLog(account.state, "system", `Admin-Gutschrift: +${amount.toLocaleString("de-DE")} Metall, Kristall und Tritium.`);
          if (pool) await pool.query("UPDATE accounts SET state = $2::jsonb WHERE account_key = $1", [key, JSON.stringify(account.state)]);
          else {
            const database = await loadLocalDatabase();
            database.accounts[key].state = account.state;
            await saveLocalDatabase(database);
          }
          results.push({ username: account.username, resources: Object.fromEntries(RESOURCE_KEYS.map((resource) => [resource, asWholeNumber(account.state.resources[resource])])) });
        }
        return results;
      });
      return json(response, 200, { ok: true, credits });
    }
    if (request.method === "GET" && url.pathname === "/api/galaxy") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const observer = activeGalaxyAccount(current.account);
      const accounts = await allAccounts();
      const allContacts = accounts.flatMap(account => account.state.planets
        .map(focusPlanet => publicGalaxyRecord({ ...account, focusPlanet }, observer)));
      const claimed = new Set(accounts.flatMap(a => a.state.planets.map(p => p.id)));
      allContacts.push(...frontierSites.filter(site => !claimed.has(site.id)).map(site => ({
        ...site, distance: galaxyDistance(galaxyPosition(observer), site.position),
      })));
      const contacts = allContacts.filter(contact => contact.own || positionIsVisible(observer, contact.position))
        .sort((a, b) => a.distance - b.distance);
      return json(response, 200, { contacts, systems: galaxySystems(allContacts, observer),
        sensorOrigins: sensorOrigins(observer), origin: galaxyPosition(observer),
        radius: sensorRange(observer), span: GALAXY_SPAN, updatedAt: Date.now() });
    }
    if (request.method === "POST" && url.pathname === "/api/colonize") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const body = await readBody(request);
      return json(response, 200, await mutate(() => colonizeSite(current.key, String(body.targetId || ""))));
    }
    if (request.method === "POST" && ["/api/raids", "/api/spy"].includes(url.pathname)) {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const body = await readBody(request);
      const targetId = String(body.targetId || "");
      const spy = url.pathname === "/api/spy";
      const result = await mutate(() => executeRaid(current.key, targetId, spy ? { probes: body.probes } : body.fleet || {}, spy));
      return json(response, 200, result);
    }
    if (request.method === "GET") return serveStatic(url.pathname === "/demo" ? "/" : url.pathname, request, response);
    return json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    json(response, error?.status || 500, { error: error?.status ? error.message : "Server error" });
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id);
}, 1000 * 60 * 15).unref();

export { server, resolveDuePvpFlights };
storageReady.then(async () => {
  await applyLordFredoCredit();
  server.listen(port, process.env.HOST || "0.0.0.0", () => console.log(`Orbital Foundry is live at http://localhost:${port}`));
}).catch((error) => {
  console.error("Database initialization failed", error);
  process.exit(1);
});
