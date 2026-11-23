// A short, self-contained training run. It never changes server game state.
const launch = document.getElementById('trial-button');
const dialog = document.getElementById('trial-dialog');
const storageKey = 'orbital-foundry-trial-v1';
let stage = 0;
let busy = false;
try { stage = Math.min(3, Math.max(0, Math.floor(Number(sessionStorage.getItem(storageKey)) || 0))); } catch {}

const english = () => document.documentElement.lang?.toLowerCase().startsWith('en');
const copy = (de, en) => english() ? en : de;
function remember() { try { sessionStorage.setItem(storageKey, String(stage)); } catch {} }
function render() {
  const steps = [
    copy('Baue eine Metallmine', 'Build a metal mine'),
    copy('Erkunde ein Sternensystem', 'Scout a star system'),
    copy('Starte eine Transportflotte', 'Launch a transport fleet'),
  ];
  const descriptions = [
    copy('Eine Mine steigert deine laufende Produktion. Im echten Spiel kostet der Ausbau Rohstoffe und Zeit.', 'A mine increases ongoing production. In the real game, construction costs resources and time.'),
    copy('Spionagesonden enthüllen Informationen zu anderen Welten. Mehr Forschung und Sonden liefern genauere Berichte.', 'Spy probes reveal information about other worlds. More research and probes provide better reports.'),
    copy('Transporter bringen Rohstoffe zu deinen Kolonien. Die Flotte ist erst nach ihrer Flugzeit am Ziel.', 'Transporters carry resources to your colonies. The fleet reaches its target after travel time.'),
  ];
  dialog.innerHTML = `<div class="trial-shell">
    <button type="button" class="trial-close" data-trial-close aria-label="${copy('Schließen', 'Close')}">×</button>
    <span class="trial-eyebrow">${copy('KOSTENLOSER PROBELAUF', 'FREE TRAINING RUN')}</span>
    <h2>${stage === 3 ? copy('Mission geschafft.', 'Mission complete.') : copy('Übernimm das Kommando.', 'Take command.')}</h2>
    <p class="trial-honesty">${copy('Dies ist eine kurze Simulation. Ein echter Spielstand beginnt nach der Registrierung.', 'This is a short simulation. Your real game progress begins after registration.')}</p>
    <div class="trial-world"><span class="trial-planet" aria-hidden="true"></span><div><strong>${stage >= 2 ? 'Vesta Prime → Kepler-7' : 'Vesta Prime'}</strong><small>${stage === 3 ? copy('Transport angekommen · Route gesichert', 'Transport arrived · route secured') : stage >= 2 ? copy('Neues Ziel entdeckt · 1 System gescannt', 'New target discovered · 1 system scanned') : copy('Heimatwelt · Orbit 04', 'Homeworld · orbit 04')}</small></div></div>
    <div class="trial-resources"><span>▰ ${copy('Metall', 'Metal')} <b>${stage >= 1 ? '99.500' : '100.000'}</b></span><span>◆ ${copy('Kristall', 'Crystal')} <b>${stage >= 1 ? '99.750' : '100.000'}</b></span><span>◉ Tritium <b>${stage >= 3 ? '99.900' : '100.000'}</b></span></div>
    <ol class="trial-steps">${steps.map((label, index) => `<li class="${index < stage ? 'done' : index === stage ? 'current' : ''}"><span>${index < stage ? '✓' : index + 1}</span>${label}</li>`).join('')}</ol>
    ${stage < 3 ? `<p class="trial-description">${descriptions[stage]}</p><button type="button" class="primary-button trial-action" data-trial-action ${busy ? 'disabled' : ''}>${busy ? copy('Befehl läuft …', 'Order in progress …') : steps[stage] + ' →'}</button>` : `<p class="trial-description">${copy('Jetzt kannst du mit einer eigenen Welt beginnen. Dein Startpaket: 100.000 Rohstoffe je Sorte und zwei Stunden Bauboost.', 'Start your own world now. Your starter pack: 100,000 of each resource and a two-hour building boost.')}</p><button type="button" class="primary-button trial-action" data-trial-register>${copy('Echten Account erstellen →', 'Create a real account →')}</button>`}
    <div class="trial-foot"><a href="/demo">${copy('Ausbau in der Spieloberfläche ausprobieren', 'Try building in the full game interface')} →</a><span>${Math.min(stage + 1, 3)} / 3</span></div>
  </div>`;
  if (dialog.dataset.demoUrl) dialog.querySelector(".trial-foot a").href = dialog.dataset.demoUrl;
}
launch?.addEventListener('click', () => {
  window.orbitalTrack?.('trial_start');
  render();
  dialog.showModal();
});
dialog?.addEventListener('click', event => {
  if (event.target === dialog || event.target.closest('[data-trial-close]')) { dialog.close(); return; }
  if (event.target.closest('[data-trial-register]')) {
    dialog.close();
    if (dialog.dataset.registerUrl) {
      location.assign(dialog.dataset.registerUrl);
      return;
    }
    document.querySelector('[data-auth-mode="register"]')?.click();
    document.getElementById('commander-input')?.focus();
    return;
  }
  if (!event.target.closest('[data-trial-action]') || busy || stage >= 3) return;
  busy = true;
  render();
  setTimeout(() => {
    stage++;
    busy = false;
    remember();
    if (stage === 3) window.orbitalTrack?.('trial_finish');
    if (dialog.open) render();
  }, stage === 2 ? 1800 : 700);
});
document.addEventListener('orbital-language-change', () => {
  if (launch) launch.textContent = copy('Kurzmission spielen · ohne Account →', 'Play a short mission · no account →');
  if (dialog?.open) render();
});
if (new URLSearchParams(location.search).get('trial') === '1') {
  document.addEventListener('orbital-session-restored', () => {
    if (!document.getElementById('commander-gate')?.classList.contains('hidden')) launch?.click();
  }, { once: true });
}
