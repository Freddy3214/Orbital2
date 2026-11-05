// First-party, aggregate traffic measurement. One visit per browser tab.
// No tracking cookies, IP addresses, user names or third-party analytics scripts.
try {
  const key = 'orbital-foundry-visit-v1';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    sessionId = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(key, sessionId);
    const query = new URLSearchParams(location.search);
    let source = query.get('utm_source') || 'direct';
    if (source === 'direct' && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (referrer.origin !== location.origin) source = referrer.hostname.replace(/^www\./, '');
      } catch { /* Ignore an invalid referrer. */ }
    }
    fetch('/api/analytics/visit', {
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
      if (!response.ok && sessionStorage.getItem(key) === sessionId) sessionStorage.removeItem(key);
    }).catch(() => {
      if (sessionStorage.getItem(key) === sessionId) sessionStorage.removeItem(key);
    });
  }
} catch { /* Browsers that block session storage still allow the game. */ }

