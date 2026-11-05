// First-party traffic count. The server deduplicates tab IDs and counts
// distinct pseudonymous IP keys; raw IP addresses never reach this script.
const uniqueCount = document.querySelector('[data-unique-ip-count]');
const visitCount = document.querySelector('[data-visit-count]');
const number = value => new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en' : 'de').format(Number(value) || 0);

async function showCounts() {
  if (!uniqueCount && !visitCount) return;
  try {
    const response = await fetch('/api/analytics/summary?days=30', { cache: 'no-store', credentials: 'omit' });
    if (!response.ok) return;
    const report = await response.json();
    if (uniqueCount) uniqueCount.textContent = number(report.uniqueIps);
    if (visitCount) visitCount.textContent = number(report.visits);
  } catch { /* Login remains available if analytics is unavailable. */ }
}

let visitRequest = Promise.resolve();
try {
  const key = 'orbital-foundry-visit-v1';
  let sessionId = sessionStorage.getItem(key);
  const created = !sessionId;
  if (created) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    sessionId = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(key, sessionId);
  }
  const query = new URLSearchParams(location.search);
  let source = query.get('utm_source') || 'direct';
  if (source === 'direct' && document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin !== location.origin) source = referrer.hostname.replace(/^www\./, '');
    } catch { /* Ignore an invalid referrer. */ }
  }
  visitRequest = fetch('/api/analytics/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      source,
      medium: query.get('utm_medium') || '',
      campaign: query.get('utm_campaign') || '',
      landing: location.pathname,
    }),
    credentials: 'omit',
    keepalive: true,
  }).then(response => {
    if (!response.ok && created && sessionStorage.getItem(key) === sessionId) sessionStorage.removeItem(key);
  }).catch(() => {
    if (created && sessionStorage.getItem(key) === sessionId) sessionStorage.removeItem(key);
  });
} catch { /* Browsers that block session storage still allow the game. */ }

visitRequest.finally(showCounts);
