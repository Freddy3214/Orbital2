import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import pg from "pg";
import { FLEET, DEFENSE } from "./public/units.js";

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
let mutationChain = Promise.resolve();
function mutate(action) {
  const result = mutationChain.then(action);
  mutationChain = result.catch(() => {});
  return result;
}
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
const SPY_REPORT_LIFETIME = 1000 * 60 * 60 * 2;
const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
};

const defaultState = (commander) => ({
  version: 3, commander, createdAt: Date.now(),
  resources: { metal: 2600, crystal: 1600, tritium: 500, lastUpdate: Date.now() },
  buildings: {
    commandCenter: 1, metalMine: 1, crystalMine: 0, tritiumSynthesizer: 0, solarPlant: 1,
    roboticsFactory: 0, researchLab: 0, shipyard: 0, metalStorage: 0, crystalStorage: 0, tritiumStorage: 0,
  },
  research: { energyTech: 0, combustionDrive: 0, plasmaTheory: 0, avionics: 0, deepSpaceSensors: 0, constructionEngineering: 0 },
  ships: { cargoDrone: 0, interceptor: 0, colonyShip: 0, spyProbe: 0 },
  activePlanetId: "vesta-prime",
  planets: [{
    id: "vesta-prime", name: "Vesta Prime", type: "temperate", classification: "Gemäßigte Welt", fields: 228,
    usedFields: 9, coordinates: "G 02 · Sektor 17 · Orbit 04", colonizedAt: Date.now(), homeworld: true,
  }],
  queues: { building: [], research: null, ship: null }, missions: [], spyReports: [],
  log: [{ at: Date.now(), type: "system", text: "Kommandozentrale verbunden. Deine Heimatwelt wartet auf Befehle." }],
});

function cleanUsername(value) {
  const name = String(value || "").trim().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, " ").slice(0, 20);
  return name.length >= 3 ? name : "";
}
function accountKey(username) { return username.toLocaleLowerCase("de-DE"); }
function cleanPassword(value) { const password = String(value || ""); return password.length >= 8 && password.length <= 128 ? password : ""; }
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
function accountFromRow(row) {
  return {
    id: row.id,
    username: row.username,
    createdAt: Number(row.created_at),
    password: { salt: row.password_salt, hash: row.password_hash },
    state: row.state,
  };
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
async function accountByKey(key) {
  if (pool) {
    const result = await pool.query(
      "SELECT id, username, created_at, password_salt, password_hash, state FROM accounts WHERE account_key = $1",
      [key],
    );
    return result.rows[0] ? accountFromRow(result.rows[0]) : null;
  }
  const database = await loadLocalDatabase();
  return database.accounts[key] || null;
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
  state.spyReports = previous.state.spyReports || [];
  state.lastSpyAt = previous.state.lastSpyAt || 0;
  const incomingDefenses = new Map(state.planets.map(p=>[p.id,p.defenses || {}]));
  state.planets = state.planets.filter(p => !String(p.id).startsWith("frontier-"));
  state.planets.push(...previous.state.planets.filter(p => String(p.id).startsWith("frontier-")).map(p=>({ ...p, defenses: incomingDefenses.get(p.id) || p.defenses || {} })));
  for (const planet of state.planets) planet.defenses = Object.fromEntries(Object.keys(DEFENSE).map(key=>[key,asWholeNumber(planet.defenses?.[key])]));
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
async function allAccounts() {
  if (pool) {
    const result = await pool.query("SELECT id, username, created_at, password_salt, password_hash, state FROM accounts");
    return result.rows.map(accountFromRow);
  }
  const database = await loadLocalDatabase();
  return Object.values(database.accounts);
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
  return Object.values(database.accounts).find((account) => account.id === id) || null;
}
function asWholeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}
function addStateLog(state, type, text) {
  state.log = [{ at: Date.now(), type, text }, ...(Array.isArray(state.log) ? state.log : [])].slice(0, 80);
}
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
  const site = frontierSites.find(site => site.id === planet.id);
  if (site) {
    if (planet.position) return planet.position;
    return { ...site.position };
  }
  const seed = stableHash(`${account.id}:${planet.id || "home"}`);
  return {
    x: 8 + seed % (GALAXY_SPAN - 16),
    y: 8 + Math.floor(seed / 211) % (GALAXY_SPAN - 16),
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
    if (galaxyDistance(galaxyPosition(activeGalaxyAccount(account)), site.position) > sensorRange(account)) fail("Ziel außerhalb der Sichtweite.", 403);
    if (!asWholeNumber(account.state.ships.colonyShip)) fail("Ein Kolonieschiff ist erforderlich.", 400);
    if (account.state.planets.length >= 20) fail("Maximal 20 Welten möglich.", 400);
    const types = [["temperate","Gemäßigte Welt"],["arid","Wüstenwelt"],["ocean","Ozeanwelt"],["ice","Eiswelt"],["volcanic","Vulkanwelt"]];
    const [type, classification] = types[randomBytes(1)[0] % types.length];
    const planet = { id: site.id, name: site.signature, type, classification, fields: 96 + randomBytes(4).readUInt32BE() % 295, usedFields: 0, coordinates: `X ${site.position.x} · Y ${site.position.y}`, colonizedAt: Date.now(), homeworld: false };
    planet.position = { ...site.position };
    planet.defenses = {};
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
function targetIsVisible(attacker, defender) {
  return galaxyDistance(galaxyPosition(attacker), galaxyPosition(defender)) <= sensorRange(attacker);
}
function recentSpyReport(state, targetId) {
  const now = Date.now();
  return (Array.isArray(state.spyReports) ? state.spyReports : []).find((report) => report.targetId === targetId && Number(report.expiresAt) > now) || null;
}
function publicGalaxyRecord(account, observer = null) {
  const planet = primaryPlanet(account);
  const position = galaxyPosition(account);
  return {
    id: signalId(account),
    signature: String(planet.name || "Unbenannte Signatur").slice(0, 36),
    owner: String(account.username || "Unbekannt").slice(0, 36),
    position,
    distance: observer ? galaxyDistance(galaxyPosition(observer), position) : null,
  };
}
function galaxySystems(contacts, observer) {
  const cellSize = 16;
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
    const ordered = [...bucket.contacts].sort((a, b) => stableHash(a.id) - stableHash(b.id));
    for (let offset = 0; offset < ordered.length; offset += 13) {
      const chunk = ordered.slice(offset, offset + 13);
      const part = Math.floor(offset / 13);
      const systemKey = `${key}-${part}`;
      const seed = stableHash(`orbital-system:${systemKey}`);
      const jitterX = (seed % 801) / 100 - 4;
      const jitterY = (Math.floor(seed / 809) % 801) / 100 - 4;
      const position = {
        x: Math.max(3, Math.min(GALAXY_SPAN - 3, bucket.cellX * cellSize + cellSize / 2 + jitterX)),
        y: Math.max(3, Math.min(GALAXY_SPAN - 3, bucket.cellY * cellSize + cellSize / 2 + jitterY)),
      };
      const slots = Array.from({ length: 13 }, (_, index) => ({ position: index + 1, empty: true }));
      for (const contact of chunk) {
        let index = stableHash(`orbit:${contact.id}`) % 13;
        while (!slots[index].empty) index = (index + 1) % 13;
        slots[index] = {
          position: index + 1,
          targetId: contact.id,
          name: contact.signature,
          owner: contact.free ? null : contact.owner,
          free: Boolean(contact.free),
          empty: false,
        };
      }
      const occupiedCount = chunk.filter((contact) => !contact.free).length;
      const freeCount = chunk.length - occupiedCount;
      systems.push({
        id: `system-${systemKey}`,
        signature: `Sektor ${String(100 + seed % 900).padStart(3, "0")}-${String.fromCharCode(65 + (Math.floor(seed / 997) % 26))}`,
        position,
        distance: galaxyDistance(galaxyPosition(observer), position),
        planetCount: chunk.length,
        occupiedCount,
        freeCount,
        luminosity: Math.min(1, .34 + chunk.length * .075),
        starSize: Math.min(62, 30 + chunk.length * 3),
        slots,
      });
    }
  }
  return systems.sort((a, b) => a.distance - b.distance || a.signature.localeCompare(b.signature, "de"));
}
function spyReportFor(attacker, defender, probeCount) {
  if (!targetIsVisible(attacker, defender)) fail("Dieses Ziel ist nicht verfügbar.", 404);
  if (Date.now() - Number(attacker.state.lastSpyAt || 0) < 15000) fail("Sondenkanal belegt. Bitte 15 Sekunden zwischen Scans warten.", 429);
  if (!Number.isInteger(probeCount) || probeCount < 1 || probeCount > 12) fail("Wähle 1 bis 12 Sonden.");
  const probes = probeCount;
  const available = asWholeNumber(attacker.state.ships?.spyProbe);
  if (!available) {
    const error = new Error("Baue zuerst mindestens eine Aufklärsonde.");
    error.status = 400;
    throw error;
  }
  if (probes > available) fail("Nicht genügend Aufklärsonden vorhanden.");
  const used = probes;
  attacker.state.lastSpyAt = Date.now();
  const attackerSensors = asWholeNumber(attacker.state.research?.deepSpaceSensors);
  const defenderSensors = asWholeNumber(defender.state.research?.deepSpaceSensors);
  const defenses = primaryPlanet(defender).defenses || {};
  const jammer = Math.min(12, asWholeNumber(defenses.sensorJammer));
  const intelligence = Math.max(1, Math.min(4, 1 + Math.floor((attackerSensors - defenderSensors - jammer + Math.log2(used + 1)) / 3)));
  const antiSpy = Object.entries(DEFENSE).reduce((sum,[key,item])=>sum+asWholeNumber(defenses[key])*item.antiSpy,0);
  const interceptionRisk = Math.max(.03, Math.min(.92, .08 + defenderSensors * .006 + antiSpy - Math.log2(used + 1) * .018));
  const lost = Math.random() < interceptionRisk ? Math.max(1, Math.floor(used * Math.min(.7, interceptionRisk + .12))) : 0;
  attacker.state.ships.spyProbe = available - lost;
  const planet = primaryPlanet(defender);
  const report = {
    id: `${defender.id}-${Date.now()}-${randomBytes(3).toString("hex")}`,
    targetId: signalId(defender),
    signature: String(planet.name || "Unbenannte Signatur").slice(0, 36),
    position: galaxyPosition(defender),
    createdAt: Date.now(),
    expiresAt: Date.now() + SPY_REPORT_LIFETIME,
    intelligence,
    probes: used,
    lost,
    risk: Math.round(interceptionRisk * 100),
    owner: intelligence >= 2 ? defender.username : null,
    world: intelligence >= 2 ? {
      classification: String(planet.classification || "Unbekannte Welt"),
      fields: Math.max(96, Math.min(390, asWholeNumber(planet.fields, 228))),
    } : null,
    resources: intelligence >= 1 ? Object.fromEntries(RESOURCE_KEYS.map((key) => [key, asWholeNumber(defender.state.resources?.[key])])) : null,
    ships: intelligence >= 2 ? Object.fromEntries(Object.entries(defender.state.ships || {}).map(([key, value]) => [key, asWholeNumber(value)])) : null,
    buildings: intelligence >= 3 ? Object.fromEntries(Object.entries(defender.state.buildings || {}).map(([key, value]) => [key, asWholeNumber(value)])) : null,
    research: intelligence >= 4 ? Object.fromEntries(Object.entries(defender.state.research || {}).map(([key, value]) => [key, asWholeNumber(value)])) : null,
    defenses: intelligence >= 3 ? Object.fromEntries(Object.keys(DEFENSE).map(key=>[key,asWholeNumber(defenses[key])])) : null,
  };
  attacker.state.spyReports = [report, ...(Array.isArray(attacker.state.spyReports) ? attacker.state.spyReports : []).filter((entry) => Number(entry.expiresAt) > Date.now())].slice(0, 20);
  addStateLog(attacker.state, "scan", `Aufklärung von ${report.signature} abgeschlossen. Informationsstufe ${intelligence}/4${lost ? ` · ${lost} Sonde verloren` : ""}.`);
  addStateLog(defender.state, "scan", `Unbekannte Sonden haben ${planet.name || "eine Welt"} ausgespäht.`);
  return report;
}
function prepareRaid(attacker, defender, rawFleet) {
  if (!targetIsVisible(attacker, defender)) fail("Dieses Ziel ist nicht verfügbar.", 404);
  if (!recentSpyReport(attacker.state, signalId(defender))) fail("Klär das Ziel zuerst mit Sonden auf.", 409);
  const fleet = Object.fromEntries(Object.keys(FLEET).map(key=>[key,Math.min(asWholeNumber(rawFleet?.[key]),asWholeNumber(attacker.state.ships?.[key]))]));
  if (!Object.values(fleet).some(Boolean)) {
    const error = new Error("Wähle mindestens ein Transport- oder Kampfschiff.");
    error.status = 400;
    throw error;
  }
  const attackerAvionics = asWholeNumber(attacker.state.research?.avionics);
  const defenderAvionics = asWholeNumber(defender.state.research?.avionics);
  const attackPower = Math.floor(Object.entries(FLEET).reduce((sum,[key,item])=>sum+fleet[key]*item.power,0) * (1 + attackerAvionics * 0.08));
  const defenderShips = defender.state.ships || {};
  const defenderBuildings = defender.state.buildings || {};
  const planetDefenses = primaryPlanet(defender).defenses || {};
  const defenseBase = Object.entries(FLEET).reduce((sum,[key,item])=>sum+asWholeNumber(defenderShips[key])*item.power,0)
    + Object.entries(DEFENSE).reduce((sum,[key,item])=>sum+asWholeNumber(planetDefenses[key])*item.power,0)
    + asWholeNumber(defenderBuildings.commandCenter) * 10 + asWholeNumber(defenderBuildings.shipyard) * 6;
  const defensePower = Math.max(25, Math.floor(defenseBase * (1 + defenderAvionics * 0.05)));
  const won = attackPower >= defensePower;
  const capacity = Object.entries(FLEET).reduce((sum,[key,item])=>sum+fleet[key]*item.cargo,0);
  const loot = { metal: 0, crystal: 0, tritium: 0 };
  if (won) {
    let remainingCapacity = capacity;
    for (const resource of RESOURCE_KEYS) {
      const available = asWholeNumber(defender.state.resources?.[resource]);
      const amount = Math.min(available, Math.floor(available * 0.15), remainingCapacity);
      loot[resource] = amount;
      remainingCapacity -= amount;
      defender.state.resources[resource] = available - amount;
      attacker.state.resources[resource] = asWholeNumber(attacker.state.resources?.[resource]) + amount;
    }
  }
  const survivorFactor = won ? 0.88 : 0.25;
  const losses = {};
  for (const key of Object.keys(FLEET)) {
    losses[key] = fleet[key] - Math.floor(fleet[key] * survivorFactor);
    attacker.state.ships[key] = asWholeNumber(attacker.state.ships[key]) - losses[key];
  }
  const defenseLosses = {};
  if (won) for (const key of Object.keys(DEFENSE)) {
    defenseLosses[key] = Math.ceil(asWholeNumber(planetDefenses[key]) * .25);
    planetDefenses[key] = asWholeNumber(planetDefenses[key]) - defenseLosses[key];
  }
  const lootText = RESOURCE_KEYS.filter((key) => loot[key]).map((key) => `${loot[key]} ${key}`).join(", ") || "keine Beute";
  addStateLog(attacker.state, won ? "mission" : "combat", won
    ? `Raubzug gegen ${defender.username} erfolgreich. Erbeutet: ${lootText}.`
    : `Raubzug gegen ${defender.username} abgewehrt. Teile der Flotte gingen verloren.`);
  addStateLog(defender.state, won ? "combat" : "mission", won
    ? `${attacker.username} hat einen Raubzug geflogen und ${lootText} entwendet.`
    : `${attacker.username} hat einen Raubzug geflogen, aber deine Verteidigung hielt stand.`);
  return { won, fleet, loot, attackPower, defensePower, losses, defenseLosses };
}
async function executeRaid(attackerKey, targetId, rawFleet, spy = false) {
  const separator = targetId.indexOf(":");
  if (separator < 0) fail("Bitte das Ziel erneut auf der Karte auswählen.", 400);
  const targetPlanetId = targetId.slice(separator + 1);
  targetId = targetId.slice(0, separator);
  const applyAction = (attacker, defender) => {
    const targetPlanet = defender.state.planets.find((planet) => planet.id === targetPlanetId);
    if (!targetPlanet) fail("Dieses Ziel ist nicht verfügbar.", 404);
    const target = { ...defender, focusPlanet: targetPlanet };
    const origin = activeGalaxyAccount(attacker);
    const report = spy ? spyReportFor(origin, target, rawFleet.probes) : prepareRaid(origin, target, rawFleet);
    attacker.state.revision = asWholeNumber(attacker.state.revision) + 1;
    defender.state.revision = asWholeNumber(defender.state.revision) + 1;
    return report;
  };
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const lockedAccounts = await client.query(
        "SELECT id, account_key, username, created_at, password_salt, password_hash, state FROM accounts WHERE account_key = $1 OR id = $2 ORDER BY id FOR UPDATE",
        [attackerKey, targetId],
      );
      const attackerRow = lockedAccounts.rows.find((row) => row.account_key === attackerKey);
      const defenderRow = lockedAccounts.rows.find((row) => row.id === targetId);
      if (!attackerRow || !defenderRow || attackerRow.id === defenderRow.id) {
        const error = new Error("Dieses Ziel ist nicht verfügbar.");
        error.status = 404;
        throw error;
      }
      const attacker = accountFromRow(attackerRow);
      const defender = accountFromRow(defenderRow);
      const report = applyAction(attacker, defender);
      await client.query("UPDATE accounts SET state = $2::jsonb WHERE account_key = $1", [attackerKey, JSON.stringify(attacker.state)]);
      await client.query("UPDATE accounts SET state = $2::jsonb WHERE id = $1", [defender.id, JSON.stringify(defender.state)]);
      await client.query("COMMIT");
      return { state: attacker.state, report };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  const database = await loadLocalDatabase();
  const attacker = database.accounts[attackerKey];
  const defenderEntry = Object.entries(database.accounts).find(([, account]) => account.id === targetId);
  if (!attacker || !defenderEntry || attacker === defenderEntry[1]) {
    const error = new Error("Dieses Ziel ist nicht verfügbar.");
    error.status = 404;
    throw error;
  }
  const [defenderKey, defender] = defenderEntry;
  const report = applyAction(attacker, defender);
  database.accounts[attackerKey] = attacker;
  database.accounts[defenderKey] = defender;
  await saveLocalDatabase(database);
  return { state: attacker.state, report };
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
  const values = [...Object.values(player.buildings || {}), ...Object.values(player.research || {})];
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
  state.version = 3;
  state.commander = username;
  for (const group of [state.buildings, state.research]) {
    for (const key of Object.keys(group)) group[key] = Math.min(LEVEL_CAP, asWholeNumber(group[key]));
  }
  for (const resource of RESOURCE_KEYS) state.resources[resource] = Math.min(Number.MAX_SAFE_INTEGER, asWholeNumber(state.resources[resource]));
  state.log = state.log.slice(0, 80);
  state.planets = state.planets.slice(0, 20);
  state.missions = state.missions.slice(0, 20);
  return state;
}
function json(response, status, payload, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
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
async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = normalize(join(publicRoot, requested));
  if (!filePath.startsWith(`${publicRoot}${sep}`) && filePath !== join(publicRoot, "index.html")) return json(response, 403, { error: "Forbidden" });
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return json(response, 404, { error: "Not found" });
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-cache" });
    createReadStream(filePath).pipe(response);
  } catch { json(response, 404, { error: "Not found" }); }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    await storageReady;
    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, { ok: true, storage: pool ? "postgres" : "file" });
    }
    if (request.method === "POST" && url.pathname === "/api/auth/register") {
      const body = await readBody(request);
      const username = cleanUsername(body.username);
      const password = cleanPassword(body.password);
      if (!username) return json(response, 400, { error: "Der Kommandantenname braucht 3–20 Zeichen." });
      if (!password) return json(response, 400, { error: "Das Passwort braucht mindestens 8 Zeichen." });
      const key = accountKey(username);
      if (await accountByKey(key)) return json(response, 409, { error: "Dieser Kommandantenname ist bereits vergeben." });
      const account = { id: randomBytes(12).toString("hex"), username, createdAt: Date.now(), password: await makePasswordRecord(password), state: defaultState(username) };
      try {
      await mutate(() => createAccount(key, account));
      } catch (error) {
        if (error?.code === "23505") return json(response, 409, { error: "Dieser Kommandantenname ist bereits vergeben." });
        throw error;
      }
      issueSession(response, key);
      return json(response, 201, { user: publicAccount(account), state: account.state });
    }
    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await readBody(request);
      const username = cleanUsername(body.username);
      const password = String(body.password || "");
      const key = username && accountKey(username);
      const account = key && await accountByKey(key);
      if (!account || !(await passwordMatches(password, account.password))) return json(response, 401, { error: "Name oder Passwort ist nicht korrekt." });
      issueSession(response, key);
      return json(response, 200, { user: publicAccount(account), state: account.state });
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      clearSession(request, response);
      return json(response, 200, { ok: true });
    }
    if (request.method === "GET" && url.pathname === "/api/session") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "No active session" });
      return json(response, 200, { user: publicAccount(current.account), state: current.account.state });
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
    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      const ranking = (await allAccounts()).map((account) => ({
        commander: account.username, score: score(account.state), planets: account.state.planets?.length || 1,
      })).sort((a, b) => b.score - a.score || a.commander.localeCompare(b.commander, "de"));
      return json(response, 200, ranking);
    }
    if (request.method === "GET" && url.pathname === "/api/galaxy") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const observer = activeGalaxyAccount(current.account);
      const accounts = await allAccounts();
      const contacts = accounts.filter((account) => account.id !== current.account.id)
        .flatMap((account) => account.state.planets.map((focusPlanet) => ({ ...account, focusPlanet })))
        .filter((account) => targetIsVisible(observer, account)).map((account) => publicGalaxyRecord(account, observer))
        .sort((a, b) => a.distance - b.distance).slice(0, 200);
      const claimed = new Set(accounts.flatMap(a => a.state.planets.map(p => p.id)));
      contacts.push(...frontierSites.filter(site => !claimed.has(site.id)).map(site => ({ ...site, distance: galaxyDistance(galaxyPosition(observer), site.position) })).filter(site => site.distance <= sensorRange(observer)));
      return json(response, 200, { contacts, systems: galaxySystems(contacts, observer), origin: galaxyPosition(observer), radius: sensorRange(observer), span: GALAXY_SPAN, updatedAt: Date.now() });
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
    if (request.method === "GET") return serveStatic(url.pathname, response);
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

storageReady.then(() => {
  server.listen(port, () => console.log(`Orbital Foundry is live at http://localhost:${port}`));
}).catch((error) => {
  console.error("Database initialization failed", error);
  process.exit(1);
});
