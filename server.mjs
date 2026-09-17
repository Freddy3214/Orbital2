import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(scryptCallback);
const root = dirname(fileURLToPath(import.meta.url));
const publicRoot = join(root, "public");
const accountFile = join(root, "data", "accounts.json");
const port = Number(process.env.PORT || 4173);
const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const sessions = new Map();
const sessionLifetime = 1000 * 60 * 60 * 24 * 30;
const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
};

const defaultState = (commander) => ({
  version: 2, commander, createdAt: Date.now(),
  resources: { metal: 2600, crystal: 1600, tritium: 500, lastUpdate: Date.now() },
  buildings: {
    commandCenter: 1, metalMine: 1, crystalMine: 0, tritiumSynthesizer: 0, solarPlant: 1,
    roboticsFactory: 0, researchLab: 0, shipyard: 0, metalStorage: 0, crystalStorage: 0, tritiumStorage: 0,
  },
  research: { energyTech: 0, combustionDrive: 0, plasmaTheory: 0, avionics: 0 },
  ships: { cargoDrone: 0, interceptor: 0, colonyShip: 0 },
  activePlanetId: "vesta-prime",
  planets: [{
    id: "vesta-prime", name: "Vesta Prime", type: "temperate", classification: "Gemäßigte Welt", fields: 228,
    usedFields: 9, coordinates: "G 02 · Sektor 17 · Orbit 04", colonizedAt: Date.now(), homeworld: true,
  }],
  queues: { building: [], research: null, ship: null }, missions: [],
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
  state.version = 2;
  state.commander = username;
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
        await createAccount(key, account);
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
      await updateAccountState(current.key, state);
      return json(response, 200, { ok: true, savedAt: Date.now() });
    }
    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      const ranking = (await allAccounts()).map((account) => ({
        commander: account.username, score: score(account.state), planets: account.state.planets?.length || 1,
      })).sort((a, b) => b.score - a.score || a.commander.localeCompare(b.commander, "de")).slice(0, 10);
      return json(response, 200, ranking);
    }
    if (request.method === "GET") return serveStatic(url.pathname, response);
    return json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    json(response, 500, { error: "Server error" });
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
