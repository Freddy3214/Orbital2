const number = value => new Intl.NumberFormat('de-DE').format(value);
const $ = id => document.getElementById(id);
async function refresh() {
  $('error').textContent = '';
  try {
    const response = await fetch(`/api/analytics/summary?days=${$('days').value}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Die Statistik konnte nicht geladen werden.');
    const data = await response.json();
    $('unique-ips').textContent = number(data.uniqueIps);
    $('visits').textContent = number(data.visits);
    $('signups').textContent = number(data.signups);
    $('accounts').textContent = number(data.totalAccounts);
    $('sources').replaceChildren();
    for (const item of data.sources) {
      const row = document.createElement('tr');
      const source = document.createElement('td');
      const visits = document.createElement('td');
      source.textContent = item.source === 'direct' ? 'Direkt / unbekannt' : item.source;
      visits.textContent = number(item.visits);
      row.append(source, visits);
      $('sources').append(row);
    }
    if (!data.sources.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.textContent = 'Noch keine Besuche erfasst.';
      row.append(cell);
      $('sources').append(row);
    }
    const max = Math.max(1, ...data.daily.map(day => day.visits));
    $('bars').replaceChildren();
    for (const day of data.daily) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${Math.max(2, day.visits / max * 100)}%`;
      bar.title = `${day.date}: ${number(day.visits)} Sitzungen, ${number(day.signups)} neue Accounts`;
      $('bars').append(bar);
    }
    $('first-day').textContent = data.daily[0]?.date || '';
    $('last-day').textContent = data.daily.at(-1)?.date || '';
    const start = data.countingSince ? new Date(data.countingSince).toLocaleString('de-DE') : 'noch keine Besuche';
    const ipStart = data.ipCountingSince ? new Date(data.ipCountingSince).toLocaleString('de-DE') : 'noch keine IPs erfasst';
    $('note').textContent = `Messbeginn: ${start}. IP-Zählung seit: ${ipStart}. Stand: ${new Date(data.updatedAt).toLocaleString('de-DE')}. Ein Besuch zählt pro Browser-Tab einmal. Verschiedene IPs sind keine eindeutigen Personen; mehrere Menschen können eine IP teilen. IPs werden nur als Kennung gespeichert und Besuchsdaten nach spätestens 90 Tagen entfernt. Registrierungen werden keiner einzelnen Quelle zugeordnet.`;
  } catch (error) { $('error').textContent = error.message; }
}
$('days').addEventListener('change', refresh);
refresh();
