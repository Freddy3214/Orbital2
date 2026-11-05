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
    const analytics = createAnalytics({ filePath, getAccounts: async () => accounts });
    await analytics.ready;
    const sessionId = 'a'.repeat(32);
    assert.equal(await analytics.recordVisit({ sessionId, source: 'reddit_indiedev', landing: '/discover.html' }), true);
    assert.equal(await analytics.recordVisit({ sessionId, source: 'direct', landing: '/' }), false);
    accounts.push({ id: 'new', createdAt: Date.now() });
    const report = await analytics.summary(7);
    assert.equal(report.visits, 1);
    assert.equal(report.signups, 1);
    assert.equal(report.totalAccounts, 2);
    assert.deepEqual(report.sources, [{ source: 'reddit_indiedev', visits: 1 }]);
    const saved = await readFile(filePath, 'utf8');
    assert.equal(saved.includes('reddit_indiedev'), true);
    assert.equal(saved.includes('old'), false);
    const reopened = createAnalytics({ filePath, getAccounts: async () => accounts });
    await reopened.ready;
    assert.equal(await reopened.recordVisit({ sessionId, source: 'direct', landing: '/' }), false);
  } finally {
    await unlink(filePath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
});

