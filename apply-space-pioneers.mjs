// apply-space-pioneers.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

function patchFile(file, replacements) {
  let content = readFileSync(file, "utf8");
  for (const [target, replacement] of replacements) {
    if (!content.includes(target)) {
      console.warn(`[WARNUNG] Stelle in ${file} bereits gepatcht oder nicht gefunden:\n`, target.slice(0, 80));
      continue;
    }
    content = content.replace(target, replacement);
  }
  writeFileSync(file, content, "utf8");
  console.log(`[OK] ${file} erfolgreich aktualisiert.`);
}

// 1. server.mjs patchen (Persistente Sessions, Flotten-Rückruf, Karriere & Trümmerfeld-Bergung)
patchFile("server.mjs", [
  [
    `  queues: { building: [], research: null, ship: null }, missions: [], pvpFlights: [], incomingFlights: [], spyReports: [], combatReports: [], messages: [], notifications: [],`,
    `  career: { path: null, warXp: 0, tradeXp: 0 },
  queues: { building: [], research: null, ship: null }, missions: [], pvpFlights: [], incomingFlights: [], spyReports: [], combatReports: [], messages: [], notifications: [],`
  ],
  [
    `  state.buildBoostUntil = previous.state.buildBoostUntil || 0;`,
    `  state.career = {
    path: ["trader", "warrior"].includes(state.career?.path) ? state.career.path : (previous.state.career?.path || null),
    warXp: Math.max(asWholeNumber(previous.state.career?.warXp), asWholeNumber(state.career?.warXp)),
    tradeXp: Math.max(asWholeNumber(previous.state.career?.tradeXp), asWholeNumber(state.career?.tradeXp)),
  };
  state.buildBoostUntil = previous.state.buildBoostUntil || 0;`
  ],
  [
    `  const attackerAvionics = asWholeNumber(attacker.state.research?.avionics);`,
    `  const isWarrior = attacker.state.career?.path === "warrior";
  const attackerAvionics = asWholeNumber(attacker.state.research?.avionics) + (isWarrior ? 2 : 0);`
  ],
  [
    `  if (won) {
    let remainingCapacity = capacity;`,
    `  const effectiveCapacity = isWarrior ? Math.floor(capacity * 1.2) : capacity;
  const salvage = { metal: 0, crystal: 0 };
  for (const [key, count] of Object.entries(defenderShipLosses)) {
    salvage.metal += Math.floor((FLEET[key]?.cost?.metal || 0) * count * (isWarrior ? 0.3 : 0.15));
    salvage.crystal += Math.floor((FLEET[key]?.cost?.crystal || 0) * count * (isWarrior ? 0.3 : 0.15));
  }
  const gainedWarXp = Object.values(defenderShipLosses).reduce((a, b) => a + b * 15, 0) + Object.values(defenseLosses).reduce((a, b) => a + b * 10, 0);
  attacker.state.career ??= { path: null, warXp: 0, tradeXp: 0 };
  attacker.state.career.warXp = asWholeNumber(attacker.state.career.warXp) + gainedWarXp;
  if (won) {
    let remainingCapacity = effectiveCapacity;`
  ],
  [
    `      stock[resource] = available - amount;
    }
  }`,
    `      stock[resource] = available - amount;
    }
    loot.metal += salvage.metal;
    loot.crystal += salvage.crystal;
  }`
  ],
  [
    `    if (request.method === "POST" && ["/api/raids", "/api/spy"].includes(url.pathname)) {`,
    `    if (request.method === "POST" && url.pathname === "/api/flights/recall") {
      const current = await authenticatedAccount(request);
      if (!current) return json(response, 401, { error: "Anmeldung erforderlich" });
      const body = await readBody(request);
      const flightId = String(body.flightId || "");
      const result = await mutate(async () => {
        const attacker = await accountByKey(current.key);
        const flight = (attacker.state.pvpFlights || []).find(f => f.id === flightId);
        if (!flight || flight.phase !== "outgoing") fail("Flotte kann nicht mehr zurückgerufen werden.", 400);
        const now = Date.now();
        const elapsed = Math.max(5000, now - flight.departedAt);
        flight.phase = "returning";
        flight.arrivesAt = now;
        flight.returnAt = now + elapsed;
        flight.survivors = { ...flight.fleet };
        flight.loot = { metal: 0, crystal: 0, tritium: 0 };
        attacker.state.revision = asWholeNumber(attacker.state.revision) + 1;
        addStateLog(attacker.state, "mission", \`Flotte nach \${flight.targetName} wurde zurückgerufen.\`);
        const defender = await accountById(flight.defenderId);
        if (defender) {
          defender.state.incomingFlights = (defender.state.incomingFlights || []).filter(f => f.id !== flight.id);
          defender.state.revision = asWholeNumber(defender.state.revision) + 1;
          if (pool) await pool.query("UPDATE accounts SET state = $2::jsonb WHERE id = $1", [defender.id, JSON.stringify(defender.state)]);
          else {
            const database = await loadLocalDatabase();
            const defKey = accountKey(defender.username);
            if (database.accounts[defKey]) database.accounts[defKey].state = defender.state;
            await saveLocalDatabase(database);
          }
        }
        await persistAccountState(current.key, attacker.state);
        return { state: attacker.state, flight };
      });
      return json(response, 200, result);
    }
    if (request.method === "POST" && ["/api/raids", "/api/spy"].includes(url.pathname)) {`
  ]
]);

// 2. public/index.html patchen (Karriere-Button im Hauptmenü)
patchFile("public/index.html", [
  [
    `<button data-view="research"><span>⌬</span> Forschung</button>`,
    `<button data-view="research"><span>⌬</span> Forschung</button>
          <button data-view="career"><span>★</span> Karriere</button>`
  ]
]);

// 3. public/app.js patchen (Space-Pioneers Biome, Karriere-Ansicht, Flotten-Rückruf)
patchFile("public/app.js", [
  [
    `const PLANET_TYPES = {
  temperate: { name: "Gemäßigte Welt", terrain: "Grünland, Meere und Gebirgsketten", position: "0% 0%", accent: "cyan" },
  arid: { name: "Aride Welt", terrain: "Staubmeere, Canyons und Erzadern", position: "50% 0%", accent: "amber" },
  ocean: { name: "Ozeanwelt", terrain: "Inselketten und tiefe Wasserbecken", position: "100% 0%", accent: "blue" },
  ice: { name: "Eiswelt", terrain: "Gletscherplatten und kryogene Risse", position: "0% 100%", accent: "ice" },
  volcanic: { name: "Vulkanische Welt", terrain: "Lavaströme und Basaltfelder", position: "50% 100%", accent: "red" },
  gas: { name: "Gasriese", terrain: "Sturmwirbel und Ammoniakbänder", position: "100% 100%", accent: "violet" },
};`,
    `const PLANET_TYPES = {
  temperate: { name: "Gemäßigte Welt", terrain: "Grünland, Meere und Gebirgsketten (+5 % alle Erträge)", position: "0% 0%", accent: "cyan", bonus: { metal: 1.05, crystal: 1.05, tritium: 1.05, solar: 1.05 } },
  arid: { name: "Aride Welt", terrain: "Staubmeere, Canyons und Erzadern (+15 % Kristall & Solar)", position: "50% 0%", accent: "amber", bonus: { metal: 1.0, crystal: 1.15, tritium: 0.9, solar: 1.15 } },
  ocean: { name: "Ozeanwelt", terrain: "Inselketten und tiefe Wasserbecken (+15 % Tritium, +5 % Kristall)", position: "100% 0%", accent: "blue", bonus: { metal: 0.95, crystal: 1.05, tritium: 1.15, solar: 1.0 } },
  ice: { name: "Eiswelt", terrain: "Gletscherplatten und kryogene Risse (+25 % Tritium, −15 % Solar)", position: "0% 100%", accent: "ice", bonus: { metal: 1.0, crystal: 1.0, tritium: 1.25, solar: 0.85 } },
  volcanic: { name: "Vulkanische Welt", terrain: "Lavaströme und Basaltfelder (+20 % Metall, +25 % Solar)", position: "50% 100%", accent: "red", bonus: { metal: 1.2, crystal: 0.95, tritium: 0.8, solar: 1.25 } },
  gas: { name: "Gasriese", terrain: "Sturmwirbel und Ammoniakbänder (+30 % Tritium)", position: "100% 100%", accent: "violet", bonus: { metal: 0.85, crystal: 0.95, tritium: 1.3, solar: 0.9 } },
};`
  ],
  [
    `  state.readReports ??= [];`,
    `  state.career ??= { path: null, warXp: 0, tradeXp: 0 };
  state.readReports ??= [];`
  ],
  [
    `function storageCap(resource, level = planetBuildings()[\`\${resource}Storage\`]) { return Math.floor(25000 * 1.65 ** level * (1 + (state.research.storageTech || 0) * .1)); }`,
    `function storageCap(resource, level = planetBuildings()[\`\${resource}Storage\`]) {
  const careerBoost = state.career?.path === "trader" ? 1.25 : 1;
  return Math.floor(25000 * 1.65 ** level * (1 + (state.research.storageTech || 0) * .1) * careerBoost);
}`
  ],
  [
    `function energyStats(planet = activePlanet()) {
  const b = planetBuildings(planet);
  const supply = energySupply(b.solarPlant) * (1 + state.research.energyTech * .05);`,
    `function energyStats(planet = activePlanet()) {
  const b = planetBuildings(planet);
  const biomeSolar = (PLANET_TYPES[planet?.type] || PLANET_TYPES.temperate).bonus?.solar || 1;
  const supply = Math.floor(energySupply(b.solarPlant) * (1 + state.research.energyTech * .05) * biomeSolar);`
  ],
  [
    `function production(planet = activePlanet(), at = Date.now()) {
  const b = planetBuildings(planet);
  const efficiency = energyStats(planet).efficiency;
  const plasma = 1 + state.research.plasmaTheory * .03;
  return {
    metal: metalOutput(b.metalMine) * productionLoad(planet, "metal") / 100 * efficiency * plasma * worldSpeedAt(at),
    crystal: crystalOutput(b.crystalMine) * productionLoad(planet, "crystal") / 100 * efficiency * plasma * worldSpeedAt(at),
    tritium: tritiumOutput(b.tritiumSynthesizer) * productionLoad(planet, "tritium") / 100 * efficiency * plasma * worldSpeedAt(at),
  };
}`,
    `function production(planet = activePlanet(), at = Date.now()) {
  const b = planetBuildings(planet);
  const efficiency = energyStats(planet).efficiency;
  const biome = (PLANET_TYPES[planet?.type] || PLANET_TYPES.temperate).bonus || { metal: 1, crystal: 1, tritium: 1 };
  const traderBoost = state.career?.path === "trader" ? 1.15 : 1;
  const plasma = (1 + state.research.plasmaTheory * .03) * traderBoost;
  return {
    metal: metalOutput(b.metalMine) * biome.metal * productionLoad(planet, "metal") / 100 * efficiency * plasma * worldSpeedAt(at),
    crystal: crystalOutput(b.crystalMine) * biome.crystal * productionLoad(planet, "crystal") / 100 * efficiency * plasma * worldSpeedAt(at),
    tritium: tritiumOutput(b.tritiumSynthesizer) * biome.tritium * productionLoad(planet, "tritium") / 100 * efficiency * plasma * worldSpeedAt(at),
  };
}`
  ],
  [
    `function transferDuration(distance) {
  const speed = worldSpeedAt();
  return Math.max(speed === 1 ? 45_000 : 30_000, Math.round((50_000 + distance * 18_000) / ((1 + (state.research.combustionDrive || 0) * .12) * speed)));
}`,
    `function transferDuration(distance) {
  const speed = worldSpeedAt();
  const traderSpeed = state.career?.path === "trader" ? 1.2 : 1;
  return Math.max(speed === 1 ? 45_000 : 30_000, Math.round((50_000 + distance * 18_000) / ((1 + (state.research.combustionDrive || 0) * .12) * speed * traderSpeed)));
}`
  ],
  [
    `    return \`<section class="fleet-operation"><div class="fleet-operation-head"><div><strong>\${escapeHtml(target.name)}</strong><span>\${escapeHtml(target.coordinates || "")}</span></div><small>\${escapeHtml(fleet || "Flottenverband")}</small></div>\${route}<div class="queue-row \${outboundDone ? "completed-leg" : ""}"><div class="queue-top"><strong>Hinflug <span>· \${outboundDone ? "angekommen" : "unterwegs"}</span></strong><span>\${outboundDone ? \`Ankunft \${formatClock(mission.arrivesAt)}\` : \`\${formatDuration(mission.arrivesAt - now)} · \${formatClock(mission.arrivesAt)}\`}</span></div><div class="progress"><i style="width:\${outboundProgress}%"></i></div></div><div class="queue-row return-leg \${outboundDone ? "active-return" : "waiting"}"><div class="queue-top"><strong>Rückflug <span>· \${outboundDone ? "unterwegs" : "geplant"}</span></strong><span>\${outboundDone ? \`\${formatDuration(returnAt - now)} · \${formatClock(returnAt)}\` : \`Rückkehr ca. \${formatClock(returnAt)}\`}</span></div><div class="progress"><i style="width:\${returnProgress}%"></i></div></div></section>\`;`,
    `    const canRecall = !outboundDone && (mission.attackerId || mission.id);
    const recallBtn = canRecall ? \`<button class="secondary-button" data-recall-flight="\${escapeHtml(mission.id)}" data-recall-pvp="\${Boolean(mission.attackerId)}">⟲ Flotte zurückrufen</button>\` : "";
    return \`<section class="fleet-operation"><div class="fleet-operation-head"><div><strong>\${escapeHtml(target.name)}</strong><span>\${escapeHtml(target.coordinates || "")}</span></div><small>\${escapeHtml(fleet || "Flottenverband")}</small></div>\${route}<div class="queue-row \${outboundDone ? "completed-leg" : ""}"><div class="queue-top"><strong>Hinflug <span>· \${outboundDone ? "angekommen" : "unterwegs"}</span></strong><span>\${outboundDone ? \`Ankunft \${formatClock(mission.arrivesAt)}\` : \`\${formatDuration(mission.arrivesAt - now)} · \${formatClock(mission.arrivesAt)}\`}</span></div><div class="progress"><i style="width:\${outboundProgress}%"></i></div>\${recallBtn}</div><div class="queue-row return-leg \${outboundDone ? "active-return" : "waiting"}"><div class="queue-top"><strong>Rückflug <span>· \${outboundDone ? "unterwegs" : "geplant"}</span></strong><span>\${outboundDone ? \`\${formatDuration(returnAt - now)} · \${formatClock(returnAt)}\` : \`Rückkehr ca. \${formatClock(returnAt)}\`}</span></div><div class="progress"><i style="width:\${returnProgress}%"></i></div></div></section>\`;`
  ],
  [
    `function statisticsView() {`,
    `function careerView() {
  const currentPath = state.career?.path || null;
  const tradeXp = (state.career?.tradeXp || 0) + state.planets.flatMap(p => Object.values(planetBuildings(p))).reduce((s, lvl) => s + lvl * 25, 0);
  const warXp = (state.career?.warXp || 0) + (state.combatReports || []).filter(r => r.side === "attacker" && r.won).length * 100;
  const tradeRank = Math.min(10, Math.floor(Math.sqrt(tradeXp / 50)));
  const warRank = Math.min(10, Math.floor(Math.sqrt(warXp / 50)));
  return \`<section class="view-heading"><div><span class="eyebrow">SPACE-PIONEERS-TRADITION</span><h1>Karriere & Spezialisierung</h1><p>Wähle die Ausrichtung deines Imperiums. Wie im Klassiker Space Pioneers bestimmt deine Laufbahn, ob deine Kolonien durch Hochleistungs-Logistik oder durch Flottenüberlegenheit und Trümmerfeld-Bergung dominieren.</p></div><span class="sector-label">\${currentPath === "trader" ? "HÄNDLERGILDE" : currentPath === "warrior" ? "KRIEGERKASTE" : "UNENTSCHIEDEN"}</span></section>
  <div class="grid two-column">
    <section class="panel"><div class="panel-inner"><div class="panel-title"><h2>◈ Pfad der Händlergilde</h2><span>RANG \${tradeRank} · \${formatNumber(tradeXp)} EP</span></div>
      <p>Fokus auf friedliche Expansion, planetare Spezialisierung und Konvoi-Logistik zwischen deinen Welten.</p>
      <div class="stat-list" style="margin:14px 0">
        <div class="stat-line"><span>Minen- & Synthese-Ertrag</span><strong class="positive">+15 % auf allen Welten</strong></div>
        <div class="stat-line"><span>Lagerkapazität</span><strong class="positive">+25 % Speichervolumen</strong></div>
        <div class="stat-line"><span>Konvoi-Antrieb</span><strong class="positive">+20 % schnellere Transporter</strong></div>
      </div>
      <button class="\${currentPath === "trader" ? "secondary-button" : "primary-button"}" data-select-career="trader" \${currentPath === "trader" ? "disabled" : ""}>\${currentPath === "trader" ? "✓ Aktive Spezialisierung" : "Händlergilde wählen"}</button>
    </div></section>
    <section class="panel"><div class="panel-inner"><div class="panel-title"><h2>⚔ Pfad der Kriegerkaste</h2><span>RANG \${warRank} · \${formatNumber(warXp)} EP</span></div>
      <p>Fokus auf taktische Raubzüge, Orbitalschlachten und die direkte Verwertung abgeschossener Feindflotten im Trümmerfeld.</p>
      <div class="stat-list" style="margin:14px 0">
        <div class="stat-line"><span>Waffen- & Zielsysteme</span><strong class="positive">+2 effektive Avionik-Stufen</strong></div>
        <div class="stat-line"><span>Beutefrachtraum bei Raids</span><strong class="positive">+20 % Plünderungskapazität</strong></div>
        <div class="stat-line"><span>Trümmerfeld-Recycler</span><strong class="positive">30 % Schrott-Bergung nach Sieg</strong></div>
      </div>
      <button class="\${currentPath === "warrior" ? "secondary-button" : "primary-button"}" data-select-career="warrior" \${currentPath === "warrior" ? "disabled" : ""}>\${currentPath === "warrior" ? "✓ Aktive Spezialisierung" : "Kriegerkaste wählen"}</button>
    </div></section>
  </div>
  <section class="panel" style="margin-top:15px"><div class="panel-inner"><div class="panel-title"><h2>Planetare Biom-Modifikatoren</h2><span>AKTIVE WELT: \${escapeHtml(activePlanet().classification)}</span></div>
    <p>Jede Weltklasse besitzt eigene geologische Vor- und Nachteile bei der Rohstoffförderung:</p>
    <div class="stat-list">
      <div class="stat-line"><span>Vulkanische Welt</span><strong>+20 % Metall · +25 % Solar · −20 % Tritium</strong></div>
      <div class="stat-line"><span>Eiswelt</span><strong>+25 % Tritium · −15 % Solar</strong></div>
      <div class="stat-line"><span>Aride Welt / Wüstenwelt</span><strong>+15 % Kristall · +15 % Solar · −10 % Tritium</strong></div>
      <div class="stat-line"><span>Ozeanwelt</span><strong>+15 % Tritium · +5 % Kristall · −5 % Metall</strong></div>
      <div class="stat-line"><span>Gemäßigte Welt</span><strong>+5 % auf Metall, Kristall, Tritium und Solar</strong></div>
    </div>
  </div></section>\`;
}
function statisticsView() {`
  ],
  [
    `const views = { overview: overviewView, buildings: buildingsView, research: researchView, shipyard: shipyardView, defense: defenseView, galaxy: galaxyView, messages: messagesView, players: playersView, log: logView, economy: economyView, fleets: fleetsView, simulator: simulatorView, ranking: rankingView, statistics: statisticsView, techtree: techtreeView, help: helpView };`,
    `const views = { overview: overviewView, buildings: buildingsView, research: researchView, career: careerView, shipyard: shipyardView, defense: defenseView, galaxy: galaxyView, messages: messagesView, players: playersView, log: logView, economy: economyView, fleets: fleetsView, simulator: simulatorView, ranking: rankingView, statistics: statisticsView, techtree: techtreeView, help: helpView };`
  ],
  [
    `  if (button.dataset.fleetFilter) { fleetStatusFilter = button.dataset.fleetFilter; render(); return; }`,
    `  if (button.dataset.selectCareer) {
    state.career ??= { path: null, warXp: 0, tradeXp: 0 };
    state.career.path = button.dataset.selectCareer;
    addLog("system", \`Spezialisierung gewählt: \${state.career.path === "trader" ? "Händlergilde" : "Kriegerkaste"}.\`);
    toast(\`Karrierepfad aktiviert: \${state.career.path === "trader" ? "Händlergilde" : "Kriegerkaste"}.\`);
    render(); save({ quiet: true }); return;
  }
  if (button.dataset.recallFlight) {
    const flightId = button.dataset.recallFlight;
    if (button.dataset.recallPvp === "true") {
      actionBusy = true;
      fetch("/api/flights/recall", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ flightId }) })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || "Rückruf fehlgeschlagen.");
          state = data.state; ensureStateShape();
          toast("Flotte wurde erfolgreich zurückgerufen.");
          render();
        })
        .catch(err => toast(err.message, true))
        .finally(() => { actionBusy = false; });
    } else {
      const mission = state.missions.find(m => m.id === flightId);
      if (mission && mission.phase === "outgoing") {
        const now = Date.now(), elapsed = Math.max(3000, now - mission.departedAt);
        mission.phase = "returning";
        mission.arrivesAt = now;
        mission.returnAt = now + elapsed;
        mission.returningFleet = mission.fleet;
        addLog("mission", "Flotte wurde vorzeitig zurückgerufen.");
        toast("Flotte dreht um und kehrt zur Startwelt zurück.");
        render(); save({ quiet: true });
      }
    }
    return;
  }
  if (button.dataset.fleetFilter) { fleetStatusFilter = button.dataset.fleetFilter; render(); return; }`
  ]
]);

// 4. public/i18n.js patchen (Übersetzungen für die neuen Space-Pioneers-Elemente)
patchFile("public/i18n.js", [
  [
    `["Kommando","Command"],`,
    `["Kommando","Command"],["Karriere","Career"],["Karriere & Spezialisierung","Career & Specialization"],["Pfad der Händlergilde","Merchant Guild Path"],["Pfad der Kriegerkaste","Warrior Caste Path"],["Händlergilde wählen","Choose Merchant Guild"],["Kriegerkaste wählen","Choose Warrior Caste"],["✓ Aktive Spezialisierung","✓ Active specialization"],["⟲ Flotte zurückrufen","⟲ Recall fleet"],`
  ]
]);

console.log("\\nAlle Space-Pioneers-Verbesserungen wurden eingebaut!");

// Optionaler automatischer Git-Commit & Push, falls Git im Ordner aktiv ist
if (process.argv.includes("--push")) {
  try {
    console.log("Starte Git Commit & Push zu GitHub (Render Auto-Deploy)...");
    execSync("git add server.mjs public/index.html public/app.js public/i18n.js", { stdio: "inherit" });
    execSync('git commit -m "Space Pioneers Update: Karrierepfade, Biom-Boni, Truemmerfeld-Bergung und Flotten-Rueckruf"', { stdio: "inherit" });
    execSync("git push", { stdio: "inherit" });
    console.log("\\n[ERFOLG] Code ist auf GitHub! Render aktualisiert https://orbital-foundry-game.onrender.com/ jetzt automatisch.");
  } catch (error) {
    console.error("Git-Push konnte nicht automatisch ausgeführt werden. Bitte führe 'git push' manuell aus.");
  }
}
