import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAnalytics } from '../analytics.mjs';

test('traffic counts browser tabs once and registrations only after counting begins', async () => {
  const filePath = join(dirname(fileURLToPath(import.meta.url)), `traffic-test-${process.pid}.json`);
  const accounts = [{ id: 'old', createdAt: Date.now() - 86_400_000 }, { id: 'npc-test', createdAt: Date.now() }];
  try {
    const analytics = createAnalytics({ filePath, getAccounts: async () => accounts, ipHashKey: 'private-test-key' });
    await analytics.ready;
    const sessionId = 'a'.repeat(32);
    const firstIp = { headers: { 'cf-connecting-ip': '203.0.113.1' } };
    const secondIp = { headers: { 'cf-connecting-ip': '203.0.113.2' } };
    assert.equal(await analytics.recordVisit({ sessionId, source: 'reddit_indiedev', landing: '/discover.html' }, firstIp), true);
    assert.equal(await analytics.recordVisit({ sessionId, source: 'direct', landing: '/' }, firstIp), false);
    assert.equal(await analytics.recordVisit({ sessionId: 'b'.repeat(32), source: 'direct', landing: '/' }, firstIp), true);
    assert.equal(await analytics.recordVisit({ sessionId: 'c'.repeat(32), source: 'direct', landing: '/' }, secondIp), true);
    accounts.push({ id: 'new', createdAt: Date.now() });
    const report = await analytics.summary(7);
    assert.equal(report.visits, 3);
    assert.equal(report.uniqueIps, 2);
    assert.equal(report.signups, 1);
    assert.equal(report.totalAccounts, 2);
    assert.deepEqual(report.sources, [{ source: 'direct', visits: 2 }, { source: 'reddit_indiedev', visits: 1 }]);
    const saved = await readFile(filePath, 'utf8');
    assert.equal(saved.includes('reddit_indiedev'), true);
    assert.equal(saved.includes('old'), false);
    assert.equal(saved.includes('203.0.113.'), false);
    const reopened = createAnalytics({ filePath, getAccounts: async () => accounts, ipHashKey: 'private-test-key' });
    await reopened.ready;
    assert.equal(await reopened.recordVisit({ sessionId, source: 'direct', landing: '/' }, firstIp), false);
  } finally {
    await unlink(filePath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
});
