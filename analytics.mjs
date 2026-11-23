import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { atomicJsonWriter } from './storage.mjs';

const DAY = 86_400_000;
const RETENTION_DAYS = 90;
const FUNNEL_EVENTS = new Set(['trial_start', 'trial_finish', 'demo_open', 'demo_order', 'register_submit', 'signup_success']);
const dateKey = at => new Date(at).toISOString().slice(0, 10);
const clean = (value, fallback = '') => {
  const text = String(value ?? '').trim().toLowerCase().slice(0, 48);
  return /^[a-z0-9][a-z0-9_.-]*$/.test(text) ? text : fallback;
};

// A random tab ID prevents reloads from inflating visits. A keyed hash of
// the trusted proxy IP supports distinct-IP counts without retaining raw IPs.
function visitorIp(request) {
  const forwarded = request?.headers?.['cf-connecting-ip'];
  if (typeof forwarded === 'string' && isIP(forwarded.trim())) return forwarded.trim();
  const direct = request?.socket?.remoteAddress;
  return typeof direct === 'string' && isIP(direct) ? direct : null;
}

// Count player-initiated orders, departures and messages from retained gameplay logs, plus explicit colony changes and cancellations.
const PLAYER_ACTION = / in die Baureihe aufgenommen| auf Stufe \d+ angestoßen\.| in der Orbitalwerft in Auftrag gegeben\.|^Konvoi nach .+ gestartet\.| nach .+ entsandt\.| unterwegs zu .+ Ankunft |^Nachricht an .+ gesendet:|^Planet umbenannt: |^Flotte (?:nach .+ wurde zurückgerufen|wurde vorzeitig zurückgerufen)\.| auf Stufe \d+ abgebrochen\. Volle Kosten erstattet\./;
export function countWeeklyPlayers(accounts, now, isTestAccount) {
  const cutoff = now - 7 * DAY;
  return accounts.filter(account => !isTestAccount(account) && Array.isArray(account.state?.log) &&
    account.state.log.some(entry => Number(entry?.at) >= cutoff && Number(entry?.at) <= now &&
      ['system', 'scan', 'mission', 'message'].includes(entry.type) && PLAYER_ACTION.test(entry.text))).length;
}

export function createAnalytics({ pool, filePath, getAccounts, ipHashKey = '', isTestAccount = () => false }) {
  const writeLocal = atomicJsonWriter(filePath);
  let local = { sessions: Object.create(null), events: Object.create(null) };
  let pending = Promise.resolve();
  let lastPrune = 0;
  let lastEventPrune = 0;

  const ready = (async () => {
    if (pool) {
      await pool.query(`CREATE TABLE IF NOT EXISTS traffic_sessions (
        session_id TEXT PRIMARY KEY,
        visited_at BIGINT NOT NULL,
        source TEXT NOT NULL,
        medium TEXT NOT NULL,
        campaign TEXT NOT NULL,
        landing TEXT NOT NULL
      )`);
      await pool.query('ALTER TABLE traffic_sessions ADD COLUMN IF NOT EXISTS ip_hash TEXT');
      await pool.query('CREATE INDEX IF NOT EXISTS traffic_sessions_visited_at_idx ON traffic_sessions (visited_at)');
      await pool.query(`CREATE TABLE IF NOT EXISTS traffic_events (
        session_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        visited_at BIGINT NOT NULL,
        PRIMARY KEY (session_id, event_name)
      )`);
      await pool.query('CREATE INDEX IF NOT EXISTS traffic_events_visited_at_idx ON traffic_events (visited_at)');
      return;
    }
    try {
      const data = JSON.parse(await readFile(filePath, 'utf8'));
      if (data && data.sessions && typeof data.sessions === 'object' && !Array.isArray(data.sessions))
        local.sessions = Object.assign(Object.create(null), data.sessions);
      if (data && data.events && typeof data.events === 'object' && !Array.isArray(data.events))
        local.events = Object.assign(Object.create(null), data.events);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  })();

  async function recordVisit(body, request) {
    await ready;
    const id = String(body.sessionId ?? '');
    if (!/^[a-f0-9]{32}$/.test(id)) return false;
    const now = Date.now();
    const ip = visitorIp(request);
    const ipHash = ip && ipHashKey ? createHmac('sha256', ipHashKey).update(ip).digest('hex') : null;
    const row = {
      at: now,
      source: clean(body.source, 'direct'),
      medium: clean(body.medium),
      campaign: clean(body.campaign),
      landing: ['/','/discover.html','/demo'].includes(body.landing) ? body.landing : '/',
      ipHash,
    };
    if (pool) {
      if (now - lastPrune > DAY) {
        lastPrune = now;
        await pool.query('DELETE FROM traffic_sessions WHERE visited_at < $1', [now - RETENTION_DAYS * DAY]);
      }
      const result = await pool.query(
        `INSERT INTO traffic_sessions (session_id, visited_at, source, medium, campaign, landing, ip_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (session_id) DO UPDATE SET ip_hash = EXCLUDED.ip_hash
         WHERE traffic_sessions.ip_hash IS NULL AND EXCLUDED.ip_hash IS NOT NULL`,
        [id, row.at, row.source, row.medium, row.campaign, row.landing, row.ipHash],
      );
      return result.rowCount > 0;
    }
    const task = pending.then(async () => {
      if (local.sessions[id]) {
        if (ipHash && !local.sessions[id].ipHash) {
          local.sessions[id].ipHash = ipHash;
          await writeLocal(local);
        }
        return false;
      }
      const cutoff = now - RETENTION_DAYS * DAY;
      for (const [key, item] of Object.entries(local.sessions))
        if (!item || item.at < cutoff) delete local.sessions[key];
      local.sessions[id] = row;
      await writeLocal(local);
      return true;
    });
    pending = task.catch(() => {});
    return task;
  }

  async function recordEvent(body, internal = false) {
    await ready;
    const id = String(body.sessionId ?? '');
    const name = String(body.event ?? '');
    if (!/^[a-f0-9]{32}$/.test(id) || !FUNNEL_EVENTS.has(name) || (name === 'signup_success' && !internal)) return false;
    const now = Date.now();
    if (pool) {
      if (now - lastEventPrune > DAY) {
        lastEventPrune = now;
        await pool.query('DELETE FROM traffic_events WHERE visited_at < $1', [now - RETENTION_DAYS * DAY]);
      }
      const result = await pool.query(
        `INSERT INTO traffic_events (session_id, event_name, visited_at)
         SELECT session_id, $2, $3 FROM traffic_sessions WHERE session_id = $1
         ON CONFLICT (session_id, event_name) DO NOTHING`,
        [id, name, now],
      );
      return result.rowCount > 0;
    }
    const task = pending.then(async () => {
      if (!local.sessions[id] || local.events[`${id}:${name}`]) return false;
      const cutoff = now - RETENTION_DAYS * DAY;
      for (const [key, item] of Object.entries(local.events))
        if (!item || item.at < cutoff) delete local.events[key];
      local.events[`${id}:${name}`] = { at: now };
      await writeLocal(local);
      return true;
    });
    pending = task.catch(() => {});
    return task;
  }

  async function summary(days = 30) {
    await ready;
    await pending;
    const span = Math.min(90, Math.max(1, Math.floor(Number(days) || 30)));
    const today = Date.now();
    const cutoff = Date.parse(`${dateKey(today - (span - 1) * DAY)}T00:00:00.000Z`);
    const rows = pool
      ? (await pool.query('SELECT visited_at, source, ip_hash FROM traffic_sessions WHERE visited_at >= $1', [cutoff])).rows.map(row => ({ at: Number(row.visited_at), source: row.source, ipHash: row.ip_hash }))
      : Object.values(local.sessions).filter(row => row.at >= cutoff);
    const eventRows = pool
      ? (await pool.query('SELECT event_name FROM traffic_events WHERE visited_at >= $1', [cutoff])).rows.map(row => row.event_name)
      : Object.entries(local.events).filter(([, row]) => row.at >= cutoff).map(([key]) => key.slice(33));
    const funnel = Object.fromEntries([...FUNNEL_EVENTS].map(name => [name, eventRows.filter(event => event === name).length]));
    const signupSources = new Map();
    const attributed = pool
      ? (await pool.query(`SELECT s.source FROM traffic_events e JOIN traffic_sessions s USING (session_id)
          WHERE e.event_name = 'signup_success' AND e.visited_at >= $1`, [cutoff])).rows.map(row => row.source)
      : Object.entries(local.events).filter(([key, row]) => key.endsWith(':signup_success') && row.at >= cutoff)
          .map(([key]) => local.sessions[key.slice(0, 32)]?.source).filter(Boolean);
    for (const source of attributed) signupSources.set(source, (signupSources.get(source) || 0) + 1);
    const firstVisit = pool
      ? Number((await pool.query('SELECT MIN(visited_at) AS first_visit FROM traffic_sessions')).rows[0]?.first_visit ?? Infinity)
      : Object.values(local.sessions).reduce((first, row) => Math.min(first, row.at), Infinity);
    const firstIpVisit = pool
      ? Number((await pool.query('SELECT MIN(visited_at) AS first_visit FROM traffic_sessions WHERE ip_hash IS NOT NULL')).rows[0]?.first_visit ?? Infinity)
      : Object.values(local.sessions).reduce((first, row) => row.ipHash ? Math.min(first, row.at) : first, Infinity);
    const accounts = (await getAccounts()).filter(account => !String(account.id).startsWith('npc-'));
    const daily = new Map();
    for (let n = 0; n < span; n++) daily.set(dateKey(today - n * DAY), { date: dateKey(today - n * DAY), visits: 0, signups: 0 });
    const sources = new Map();
    for (const row of rows) {
      const day = daily.get(dateKey(row.at));
      if (!day) continue;
      day.visits++;
      sources.set(row.source, (sources.get(row.source) || 0) + 1);
    }
    for (const account of accounts) {
      const day = daily.get(dateKey(Number(account.createdAt)));
      if (day && Number(account.createdAt) >= firstVisit) day.signups++;
    }
    return {
      days: span,
      visits: rows.length,
      uniqueIps: new Set(rows.map(row => row.ipHash).filter(Boolean)).size,
      signups: [...daily.values()].reduce((sum, day) => sum + day.signups, 0),
      totalAccounts: accounts.length,
      weeklyActivePlayers: countWeeklyPlayers(accounts, today, isTestAccount),
      funnel,
      signupSources: [...signupSources].map(([source, signups]) => ({ source, signups })).sort((a, b) => b.signups - a.signups || a.source.localeCompare(b.source)),
      daily: [...daily.values()].reverse(),
      sources: [...sources].map(([source, visits]) => ({ source, visits })).sort((a, b) => b.visits - a.visits || a.source.localeCompare(b.source)),
      countingSince: Number.isFinite(firstVisit) ? new Date(firstVisit).toISOString() : null,
      ipCountingSince: Number.isFinite(firstIpVisit) ? new Date(firstIpVisit).toISOString() : null,
      updatedAt: today,
    };
  }

  return { ready, recordVisit, recordEvent, recordSignup: sessionId => recordEvent({ sessionId, event: 'signup_success' }, true), summary };
}
