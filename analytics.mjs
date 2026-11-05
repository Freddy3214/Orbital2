import { readFile } from 'node:fs/promises';
import { atomicJsonWriter } from './storage.mjs';

const DAY = 86_400_000;
const RETENTION_DAYS = 90;
const dateKey = at => new Date(at).toISOString().slice(0, 10);
const clean = (value, fallback = '') => {
  const text = String(value ?? '').trim().toLowerCase().slice(0, 48);
  return /^[a-z0-9][a-z0-9_.-]*$/.test(text) ? text : fallback;
};

// A random tab ID prevents reloads from inflating the count. No IP address,
// user-agent, account name or full referrer URL is retained.
export function createAnalytics({ pool, filePath, getAccounts }) {
  const writeLocal = atomicJsonWriter(filePath);
  let local = { sessions: Object.create(null) };
  let pending = Promise.resolve();
  let lastPrune = 0;

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
      await pool.query('CREATE INDEX IF NOT EXISTS traffic_sessions_visited_at_idx ON traffic_sessions (visited_at)');
      return;
    }
    try {
      const data = JSON.parse(await readFile(filePath, 'utf8'));
      if (data && data.sessions && typeof data.sessions === 'object' && !Array.isArray(data.sessions))
        local.sessions = Object.assign(Object.create(null), data.sessions);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  })();

  async function recordVisit(body) {
    await ready;
    const id = String(body.sessionId ?? '');
    if (!/^[a-f0-9]{32}$/.test(id)) return false;
    const now = Date.now();
    const row = {
      at: now,
      source: clean(body.source, 'direct'),
      medium: clean(body.medium),
      campaign: clean(body.campaign),
      landing: ['/','/discover.html','/demo'].includes(body.landing) ? body.landing : '/',
    };
    if (pool) {
      if (now - lastPrune > DAY) {
        lastPrune = now;
        await pool.query('DELETE FROM traffic_sessions WHERE visited_at < $1', [now - RETENTION_DAYS * DAY]);
      }
      const result = await pool.query(
        `INSERT INTO traffic_sessions (session_id, visited_at, source, medium, campaign, landing)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (session_id) DO NOTHING`,
        [id, row.at, row.source, row.medium, row.campaign, row.landing],
      );
      return result.rowCount > 0;
    }
    const task = pending.then(async () => {
      if (local.sessions[id]) return false;
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

  async function summary(days = 30) {
    await ready;
    await pending;
    const span = Math.min(90, Math.max(1, Math.floor(Number(days) || 30)));
    const today = Date.now();
    const cutoff = Date.parse(`${dateKey(today - (span - 1) * DAY)}T00:00:00.000Z`);
    const rows = pool
      ? (await pool.query('SELECT visited_at, source FROM traffic_sessions WHERE visited_at >= $1', [cutoff])).rows.map(row => ({ at: Number(row.visited_at), source: row.source }))
      : Object.values(local.sessions).filter(row => row.at >= cutoff);
    const firstVisit = pool
      ? Number((await pool.query('SELECT MIN(visited_at) AS first_visit FROM traffic_sessions')).rows[0]?.first_visit ?? Infinity)
      : Object.values(local.sessions).reduce((first, row) => Math.min(first, row.at), Infinity);
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
      signups: [...daily.values()].reduce((sum, day) => sum + day.signups, 0),
      totalAccounts: accounts.length,
      daily: [...daily.values()].reverse(),
      sources: [...sources].map(([source, visits]) => ({ source, visits })).sort((a, b) => b.visits - a.visits || a.source.localeCompare(b.source)),
      countingSince: Number.isFinite(firstVisit) ? new Date(firstVisit).toISOString() : null,
      updatedAt: today,
    };
  }

  return { ready, recordVisit, summary };
}

