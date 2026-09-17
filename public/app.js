const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const content = $("#content");

const RESOURCE_LABELS = { metal: "Metall", crystal: "Kristall", tritium: "Tritium" };
const RESOURCE_SYMBOLS = { metal: "Fe", crystal: "Cr", tritium: "Tr" };

const BUILDINGS = {
  metalMine: {
    icon: "⛏", image: "/assets/metal-mine.svg", fieldCost: 1, name: "Metallmine", group: "Ökonomie", factor: 1.5, base: { metal: 60, crystal: 15 },
    description: "Fördert Baulegierungen aus der planetaren Kruste.",
    detail: (level) => `Produktion: ${formatNumber(metalOutput(level))} Metall / h`,
  },
  crystalMine: {
    icon: "◇", image: "/assets/crystal-mine.svg", fieldCost: 1, name: "Kristallmine", group: "Ökonomie", factor: 1.6, base: { metal: 48, crystal: 24 },
    description: "Gewinnt Leitkristalle für Forschung und Schiffselektronik.",
    detail: (level) => `Produktion: ${formatNumber(crystalOutput(level))} Kristall / h`,
  },
  tritiumSynthesizer: {
    icon: "◌", image: "/assets/tritium-synth.svg", fieldCost: 2, name: "Tritium-Synthesizer", group: "Ökonomie", factor: 1.5, base: { metal: 225, crystal: 75 },
    description: "Verdichtet seltene Isotope zu Treibstoff für interstellare Einsätze.",
    detail: (level) => `Produktion: ${formatNumber(tritiumOutput(level))} Tritium / h`,
  },
  solarPlant: {
    icon: "☼", image: "/assets/solar-array.svg", fieldCost: 2, name: "Solarkraftwerk", group: "Ökonomie", factor: 1.5, base: { metal: 75, crystal: 30 },
    description: "Versorgt die Industriezonen mit sauberer Energie.",
    detail: (level) => `Leistung: ${formatNumber(energySupply(level))} Energie`,
  },
  metalStorage: {
    icon: "▣", image: "/assets/command-hub.svg", fieldCost: 2, name: "Metallspeicher", group: "Infrastruktur", factor: 1.65, base: { metal: 200, crystal: 90 },
    description: "Erhöht die Lagergrenze für Metall deutlich.",
    detail: (level) => `Kapazität: ${formatNumber(storageCap("metal", level))}`,
  },
  crystalStorage: {
    icon: "▤", image: "/assets/command-hub.svg", fieldCost: 2, name: "Kristallspeicher", group: "Infrastruktur", factor: 1.65, base: { metal: 180, crystal: 120 },
    description: "Sichert die empfindlichen Kristallreserven der Kolonie.",
    detail: (level) => `Kapazität: ${formatNumber(storageCap("crystal", level))}`,
  },
  tritiumStorage: {
    icon: "▥", image: "/assets/tritium-synth.svg", fieldCost: 2, name: "Tritiumtanks", group: "Infrastruktur", factor: 1.65, base: { metal: 250, crystal: 100 },
    description: "Erweitert die kryogene Treibstofflagerung.",
    detail: (level) => `Kapazität: ${formatNumber(storageCap("tritium", level))}`,
  },
  roboticsFactory: {
    icon: "⚙", image: "/assets/command-hub.svg", fieldCost: 3, name: "Roboterfabrik", group: "Infrastruktur", factor: 1.7, base: { metal: 400, crystal: 120 },
    description: "Montageeinheiten beschleunigen jeden Bauauftrag auf dieser Welt.",
    detail: (level) => `Bautempo: +${level * 100}%`,
    requires: () => [],
  },
  researchLab: {
    icon: "⌬", image: "/assets/research-lab.svg", fieldCost: 3, name: "Forschungslabor", group: "Infrastruktur", factor: 1.6, base: { metal: 200, crystal: 400 },
    description: "Entschlüsselt neue Technologien und verkürzt Forschungszeiten.",
    detail: (level) => `Forschungstempo: +${level * 100}%`,
    requires: (s) => [requirement(s.buildings.roboticsFactory >= 2, "Roboterfabrik Stufe 2")],
  },
  shipyard: {
    icon: "➤", image: "/assets/orbital-shipyard.svg", fieldCost: 4, name: "Orbitalwerft", group: "Infrastruktur", factor: 1.7, base: { metal: 400, crystal: 200 },
    description: "Baut zivile Drohnen und die ersten Abfangjäger der Kolonie.",
    detail: (level) => `Freischaltungen: ${level >= 2 ? "Drohnenproduktion" : "Grundrahmen"}`,
    requires: (s) => [requirement(s.buildings.roboticsFactory >= 2, "Roboterfabrik Stufe 2")],
  },
  commandCenter: {
    icon: "◎", image: "/assets/command-hub.svg", fieldCost: 6, name: "Kommandozentrale", group: "Infrastruktur", factor: 1.8, base: { metal: 160, crystal: 160 },
    description: "Koordiniert die Expansion und erhöht den Imperiumswert.",
    detail: (level) => `Kommandolevel: ${level}`,
  },
};

const RESEARCH = {
  energyTech: {
    icon: "ϟ", image: "/assets/research-lab.svg", name: "Energietechnik", factor: 1.7, base: { metal: 120, crystal: 80 },
    description: "Optimiert die Energieverteilung. Jedes Level erhöht die Solarleistung um 5 %.",
    detail: (level) => `Solarbonus: +${level * 5}%`,
    requires: (s) => [requirement(s.buildings.researchLab >= 1, "Forschungslabor Stufe 1")],
  },
  combustionDrive: {
    icon: "↗", image: "/assets/research-lab.svg", name: "Verbrennungsantrieb", factor: 1.8, base: { metal: 220, crystal: 100, tritium: 80 },
    description: "Legt die Basis für Transportdrohnen und Interzeptoren.",
    detail: (level) => `Flugtempo: +${level * 12}%`,
    requires: (s) => [
      requirement(s.buildings.researchLab >= 1, "Forschungslabor Stufe 1"),
      requirement(s.research.energyTech >= 1, "Energietechnik Stufe 1"),
    ],
  },
  avionics: {
    icon: "◈", image: "/assets/research-lab.svg", name: "Avionik", factor: 1.85, base: { metal: 350, crystal: 400, tritium: 150 },
    description: "Verbessert die Zielerfassung aller eingesetzten Schiffe.",
    detail: (level) => `Kampfstärke: +${level * 8}%`,
    requires: (s) => [requirement(s.buildings.researchLab >= 2, "Forschungslabor Stufe 2")],
  },
  plasmaTheory: {
    icon: "✧", image: "/assets/research-lab.svg", name: "Plasmatheorie", factor: 1.9, base: { metal: 500, crystal: 350, tritium: 150 },
    description: "Verstärkt die Erträge der Rohstoffveredelung.",
    detail: (level) => `Minenbonus: +${level * 3}%`,
    requires: (s) => [
      requirement(s.buildings.researchLab >= 3, "Forschungslabor Stufe 3"),
      requirement(s.research.energyTech >= 3, "Energietechnik Stufe 3"),
    ],
  },
};

const SHIPS = {
  cargoDrone: {
    icon: "◫", image: "/assets/cargo-drone.svg", name: "Frachtdrohne", cost: { metal: 180, crystal: 80, tritium: 40 },
    description: "Ein autonomer Transporter für Bergungs- und Liefermissionen.",
    stats: "Stärke 4 · Fracht 500", requires: (s) => [
      requirement(s.buildings.shipyard >= 2, "Orbitalwerft Stufe 2"),
      requirement(s.research.combustionDrive >= 1, "Verbrennungsantrieb Stufe 1"),
    ],
  },
  interceptor: {
    icon: "⋈", image: "/assets/interceptor.svg", name: "Interzeptor", cost: { metal: 270, crystal: 160, tritium: 80 },
    description: "Leichter Abfangjäger für riskante Expeditionen und Piratenabwehr.",
    stats: "Stärke 45 · keine Fracht", requires: (s) => [
      requirement(s.buildings.shipyard >= 1, "Orbitalwerft Stufe 1"),
      requirement(s.research.combustionDrive >= 1, "Verbrennungsantrieb Stufe 1"),
    ],
  },
  colonyShip: {
    icon: "◉", image: "/assets/colony-ship.svg", name: "Kolonieschiff", cost: { metal: 1250, crystal: 920, tritium: 600 },
    description: "Ein einmalig einsetzbares Schiff mit Pioniermodul und Grundversorgung für eine neue Kolonie.",
    stats: "Besiedelt 1 unbekannte Welt", requires: (s) => [
      requirement(s.buildings.shipyard >= 3, "Orbitalwerft Stufe 3"),
      requirement(s.research.combustionDrive >= 2, "Verbrennungsantrieb Stufe 2"),
      requirement(s.buildings.researchLab >= 1, "Forschungslabor Stufe 1"),
    ],
  },
};

const MISSIONS = {
  derelict: {
    id: "derelict", name: "Verlassene Raffinerie", coordinates: "G 02 · Sektor 17 · Orbit 07", kind: "Bergung", minutes: 0.45,
    defense: 0, reward: { metal: 260, crystal: 150, tritium: 55 },
    description: "Ein stillgelegter Außenposten sendet ein schwaches Notsignal. Eine Frachtdrohne kann verwertbare Vorräte bergen.",
  },
  relay: {
    id: "relay", name: "Relais Kappa", coordinates: "G 02 · Sektor 18 · Orbit 03", kind: "Bergung", minutes: 0.7,
    defense: 18, reward: { metal: 410, crystal: 260, tritium: 110 },
    description: "Ein automatisches Bergbau-Relais ist außer Kontrolle. Die Sicherungssysteme sind noch aktiv.",
  },
  pirates: {
    id: "pirates", name: "Piratenversteck Rho", coordinates: "G 02 · Sektor 19 · Orbit 11", kind: "Angriff", minutes: 0.9,
    defense: 65, reward: { metal: 680, crystal: 430, tritium: 210 },
    description: "Schrottsammler haben sich in einem Asteroidenfeld verschanzt. Ein Interzeptor ist empfehlenswert.",
  },
  uncharted: {
    id: "uncharted", name: "Unkartierte Welt", coordinates: "G 02 · Sektor 21 · Orbit unbekannt", kind: "Kolonisierung", minutes: 1.1,
    defense: 0, colonization: true, reward: {},
    description: "Langstreckensensoren sehen nur die Silhouette einer bewohnbaren Welt. Ihre Planetengröße und Zahl der Baufelder bleiben bis zur Landung unbekannt.",
  },
};

let state = null;
let activeView = "overview";
let leaderboard = [];
let saveTimer = null;
let lastLeaderboardFetch = 0;
let isSaving = false;
let authMode = "register";

const PLANET_TYPES = {
  temperate: { name: "Gemäßigte Welt", terrain: "Grünland, Meere und Gebirgsketten", position: "0% 0%", accent: "cyan" },
  arid: { name: "Aride Welt", terrain: "Staubmeere, Canyons und Erzadern", position: "50% 0%", accent: "amber" },
  ocean: { name: "Ozeanwelt", terrain: "Inselketten und tiefe Wasserbecken", position: "100% 0%", accent: "blue" },
  ice: { name: "Eiswelt", terrain: "Gletscherplatten und kryogene Risse", position: "0% 100%", accent: "ice" },
  volcanic: { name: "Vulkanische Welt", terrain: "Lavaströme und Basaltfelder", position: "50% 100%", accent: "red" },
  gas: { name: "Gasriese", terrain: "Sturmwirbel und Ammoniakbänder", position: "100% 100%", accent: "violet" },
};

function requirement(ok, text) { return { ok, text }; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function formatNumber(value) { return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(Number(value) || 0))); }
function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
function getCost(config, targetLevel) {
  const cost = {};
  for (const resource of Object.keys(RESOURCE_LABELS)) {
    cost[resource] = Math.ceil((config.base?.[resource] || 0) * config.factor ** (targetLevel - 1));
  }
  return cost;
}
function hasResources(cost) { return Object.keys(RESOURCE_LABELS).every((key) => (state.resources[key] || 0) + .001 >= (cost[key] || 0)); }
function costMarkup(cost) {
  return Object.entries(cost).filter(([, value]) => value > 0).map(([key, value]) => `<span><b>${RESOURCE_SYMBOLS[key]}</b> ${formatNumber(value)}</span>`).join("");
}
function addLog(type, text) {
  state.log.unshift({ at: Date.now(), type, text });
  state.log = state.log.slice(0, 80);
}
function calculatedHomeFields() {
  return Object.entries(state.buildings).reduce((sum, [key, level]) => sum + (BUILDINGS[key]?.fieldCost || 1) * level, 0);
}
function activePlanet() {
  return state.planets.find((planet) => planet.id === state.activePlanetId) || state.planets[0];
}
function fieldUsage(planet = activePlanet()) {
  return planet.homeworld ? calculatedHomeFields() : planet.usedFields;
}
function availableFields(planet = activePlanet()) {
  return Math.max(0, planet.fields - fieldUsage(planet));
}
function hasFreeFields(config) {
  const reserved = buildingQueue().reduce((sum, item) => sum + (BUILDINGS[item.key]?.fieldCost || 0), 0);
  return availableFields() - reserved >= (config.fieldCost || 0);
}
function planetSizeLabel(fields) {
  if (fields < 160) return "Kleiner Planet";
  if (fields < 240) return "Kompakter Planet";
  if (fields < 320) return "Großer Planet";
  return "Riesiger Planet";
}
function createColony() {
  const fields = 96 + Math.floor(Math.random() * 295);
  const typeKey = Object.keys(PLANET_TYPES)[Math.floor(Math.random() * Object.keys(PLANET_TYPES).length)];
  const type = PLANET_TYPES[typeKey];
  const count = state.planets.length + 1;
  const names = ["Aurelia", "Nerys", "Kallisto", "Ithara", "Myris", "Solis"];
  return {
    id: `colony-${Date.now()}`,
    name: `${names[(count - 2) % names.length]} ${count - 1}`,
    type: typeKey,
    classification: type.name,
    fields,
    usedFields: 6,
    coordinates: `G 02 · Sektor ${20 + count} · Orbit ${2 + Math.floor(Math.random() * 13)}`,
    colonizedAt: Date.now(),
    homeworld: false,
  };
}
function ensureStateShape() {
  state.ships.colonyShip ??= 0;
  if (!Array.isArray(state.planets) || !state.planets.length) {
    state.planets = [{ id: "vesta-prime", name: "Vesta Prime", type: "temperate", classification: "Gemäßigte Welt", fields: 228, usedFields: 0, coordinates: "G 02 · Sektor 17 · Orbit 04", colonizedAt: state.createdAt || Date.now(), homeworld: true }];
  }
  state.activePlanetId ??= state.planets[0].id;
  state.queues ??= {};
  if (!Array.isArray(state.queues.building)) state.queues.building = state.queues.building ? [state.queues.building] : [];
  state.queues.research ??= null;
  state.queues.ship ??= null;
  state.planets = state.planets.map((planet, index) => ({
    id: planet.id || `planet-${index}`,
    name: planet.name || `Kolonie ${index}`,
    type: PLANET_TYPES[planet.type] ? planet.type : "temperate",
    classification: planet.classification || PLANET_TYPES[planet.type]?.name || "Gemäßigte Welt",
    fields: Math.max(96, Math.min(390, Number(planet.fields) || 228)),
    usedFields: Number(planet.usedFields) || 6,
    coordinates: planet.coordinates || "Unbekannte Koordinaten",
    colonizedAt: planet.colonizedAt || Date.now(),
    homeworld: Boolean(planet.homeworld || index === 0),
  }));
  const homeworld = state.planets.find((planet) => planet.homeworld);
  if (homeworld) homeworld.usedFields = calculatedHomeFields();
}
function buildingQueue() { return Array.isArray(state?.queues?.building) ? state.queues.building : []; }
function projectedBuildingLevel(key) { return (state.buildings[key] || 0) + buildingQueue().filter((item) => item.key === key).length; }
function projectedBuildingState() {
  const projected = { ...state, buildings: { ...state.buildings } };
  for (const item of buildingQueue()) projected.buildings[item.key] = item.targetLevel;
  return projected;
}
function planetArtMarkup(planet, className = "") {
  const type = PLANET_TYPES[planet.type] || PLANET_TYPES.temperate;
  return `<span class="planet-art ${className}" style="--planet-position:${type.position}" role="img" aria-label="${escapeHtml(type.name)}: ${escapeHtml(type.terrain)}"></span>`;
}

function metalOutput(level) { return Math.floor(30 * level * 1.1 ** level) + 30; }
function crystalOutput(level) { return Math.floor(20 * level * 1.1 ** level) + 15; }
function tritiumOutput(level) { return Math.floor(10 * level * 1.1 ** level); }
function energySupply(level) { return Math.floor(20 * level * 1.1 ** level); }
function storageCap(resource, level = state.buildings[`${resource}Storage`]) { return Math.floor(5000 * 1.65 ** level); }
function energyStats() {
  const b = state.buildings;
  const supply = energySupply(b.solarPlant) * (1 + state.research.energyTech * .05);
  const demand = Math.floor(10 * b.metalMine * 1.1 ** b.metalMine) + Math.floor(10 * b.crystalMine * 1.1 ** b.crystalMine) + Math.floor(20 * b.tritiumSynthesizer * 1.1 ** b.tritiumSynthesizer);
  const efficiency = demand === 0 ? 1 : Math.min(1, supply / demand);
  return { supply, demand, efficiency, net: supply - demand };
}
function production() {
  const b = state.buildings;
  const efficiency = energyStats().efficiency;
  const plasma = 1 + state.research.plasmaTheory * .03;
  return {
    metal: metalOutput(b.metalMine) * efficiency * plasma,
    crystal: crystalOutput(b.crystalMine) * efficiency * plasma,
    tritium: tritiumOutput(b.tritiumSynthesizer) * efficiency * plasma,
  };
}
function playerScore() {
  const levels = [...Object.values(state.buildings), ...Object.values(state.research)];
  return Math.floor(levels.reduce((sum, level) => sum + level ** 2 * 12, 0) + Object.values(state.ships).reduce((sum, count) => sum + count * 4, 0));
}
function buildTime(cost) { return Math.max(5000, ((cost.metal + cost.crystal + cost.tritium) / (100 * (1 + state.buildings.roboticsFactory))) * 1000); }
function researchTime(cost) { return Math.max(5000, ((cost.metal + cost.crystal + cost.tritium) / (80 * (1 + state.buildings.researchLab))) * 1000); }
function shipTime(cost) { return Math.max(5000, ((cost.metal + cost.crystal + cost.tritium) / (105 * (1 + state.buildings.shipyard))) * 1000); }

function addProduction(hours) {
  if (hours <= 0) return;
  const rate = production();
  for (const resource of Object.keys(RESOURCE_LABELS)) {
    state.resources[resource] = Math.min(storageCap(resource), state.resources[resource] + rate[resource] * hours);
  }
}
function grantResources(reward) {
  for (const resource of Object.keys(RESOURCE_LABELS)) {
    state.resources[resource] = Math.min(storageCap(resource), state.resources[resource] + (reward[resource] || 0));
  }
}
function nextEventAfter(cursor, now) {
  const times = [now];
  const activeBuilding = buildingQueue()[0];
  for (const queue of [activeBuilding, state.queues.research, state.queues.ship]) {
    if (queue?.completesAt > cursor && queue.completesAt <= now) times.push(queue.completesAt);
  }
  for (const mission of state.missions) {
    if (mission.phase === "outgoing" && mission.arrivesAt > cursor && mission.arrivesAt <= now) times.push(mission.arrivesAt);
    if (mission.phase === "returning" && mission.returnAt > cursor && mission.returnAt <= now) times.push(mission.returnAt);
  }
  return Math.min(...times);
}
function activateNextBuilding(at = Date.now()) {
  const next = buildingQueue()[0];
  if (!next || next.startedAt) return;
  next.startedAt = at;
  next.completesAt = at + buildTime(next.cost || getCost(BUILDINGS[next.key], next.targetLevel));
}
function resolveQueues(at) {
  const activeBuilding = buildingQueue()[0];
  if (activeBuilding?.completesAt <= at) {
    state.buildings[activeBuilding.key] = activeBuilding.targetLevel;
    buildingQueue().shift();
    const planet = activePlanet();
    if (planet?.homeworld) planet.usedFields = calculatedHomeFields();
    addLog("system", `${BUILDINGS[activeBuilding.key].name} auf Stufe ${activeBuilding.targetLevel} abgeschlossen.`);
    activateNextBuilding(at);
  }
  for (const kind of ["research", "ship"]) {
    const queue = state.queues[kind];
    if (!queue || queue.completesAt > at) continue;
    if (kind === "research") {
      state.research[queue.key] = queue.targetLevel;
      addLog("system", `${RESEARCH[queue.key].name} auf Stufe ${queue.targetLevel} erforscht.`);
    } else {
      state.ships[queue.key] += queue.amount;
      addLog("system", `${queue.amount}× ${SHIPS[queue.key].name} aus der Orbitalwerft übernommen.`);
    }
    state.queues[kind] = null;
  }
}
function resolveMissions(at) {
  const remaining = [];
  for (const mission of state.missions) {
    const target = MISSIONS[mission.targetId];
    if (mission.phase === "outgoing" && mission.arrivesAt <= at) {
      if (target.colonization) {
        const colony = createColony();
        state.planets.push(colony);
        addLog("mission", `${colony.name} besiedelt: ${planetSizeLabel(colony.fields)} mit ${colony.fields} Baufeldern entdeckt.`);
        continue;
      }
      const fighterPower = mission.fleet.interceptor * 45 + mission.fleet.cargoDrone * 4;
      const avionicsBoost = 1 + state.research.avionics * .08;
      const won = fighterPower * avionicsBoost >= target.defense;
      const rewardFactor = won ? 1 : target.defense === 0 ? 1 : .28;
      const reward = Object.fromEntries(Object.entries(target.reward).map(([resource, amount]) => [resource, Math.floor(amount * rewardFactor)]));
      grantResources(reward);
      mission.won = won;
      mission.reward = reward;
      mission.returningFleet = won ? mission.fleet : { cargoDrone: 0, interceptor: 0, colonyShip: 0 };
      mission.phase = "returning";
      mission.returnAt = at + mission.duration / 2;
      const rewardText = Object.entries(reward).map(([key, value]) => `${formatNumber(value)} ${RESOURCE_LABELS[key]}`).join(", ");
      addLog(won ? "mission" : "combat", won
        ? `${target.name} gesichert. Bergung: ${rewardText}. Flotte kehrt zurück.`
        : `${target.name}: Sicherungssysteme zu stark. Teilbergung ${rewardText}; Einsatzflotte ging verloren.`);
      remaining.push(mission);
    } else if (mission.phase === "returning" && mission.returnAt <= at) {
      for (const [ship, count] of Object.entries(mission.returningFleet)) state.ships[ship] += count;
      addLog("mission", `Einsatzflotte von ${target.name} ist wieder in Vesta Prime eingetroffen.`);
    } else {
      remaining.push(mission);
    }
  }
  state.missions = remaining;
}
function synchronize() {
  if (!state) return false;
  const now = Date.now();
  let cursor = Math.min(Number(state.resources.lastUpdate) || now, now);
  let changed = false;
  let guard = 0;
  activateNextBuilding(cursor);
  while (cursor < now && guard < 80) {
    const next = nextEventAfter(cursor, now);
    if (next > cursor) { addProduction((next - cursor) / 3_600_000); cursor = next; changed = true; }
    resolveQueues(cursor);
    resolveMissions(cursor);
    guard += 1;
  }
  state.resources.lastUpdate = now;
  return changed;
}

async function save({ quiet = false } = {}) {
  if (!state || isSaving) return;
  isSaving = true;
  const status = $("#save-state");
  if (status) status.textContent = "speichert …";
  try {
    synchronize();
    const response = await fetch("/api/state", {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ state }),
    });
    if (response.status === 401) throw new Error("Sitzung abgelaufen");
    if (!response.ok) throw new Error("Speichern fehlgeschlagen");
    if (status) status.textContent = "gespeichert";
    if (!quiet) toast("Spielstand übertragen.");
  } catch (error) {
    if (status) status.textContent = "offline gespeichert";
    if (!quiet) toast("Server nicht erreichbar. Bitte später erneut speichern.", true);
  } finally {
    isSaving = false;
  }
}

async function fetchLeaderboard() {
  if (!state || Date.now() - lastLeaderboardFetch < 12_000) return;
  lastLeaderboardFetch = Date.now();
  try {
    const response = await fetch("/api/leaderboard");
    if (!response.ok) return;
    leaderboard = await response.json();
    if (activeView === "overview") render();
  } catch { /* The game remains usable when the leaderboard endpoint is unavailable. */ }
}

function setGateMode(mode) {
  authMode = mode;
  const login = mode === "login";
  $$('[data-auth-mode]').forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  $("#gate-eyebrow").textContent = login ? "RÜCKKEHR ZUM KOMMANDOKANAL" : "NEUER KOMMANDOKANAL";
  $("#gate-title").textContent = login ? "Willkommen zurück." : "Deine erste Welt wartet.";
  $("#gate-copy").textContent = login ? "Melde dich an und führe deinen gespeicherten Spielstand fort." : "Lege einen Kommandantenaccount an. Dein Fortschritt bleibt auf dem Spielserver gespeichert.";
  $("#start-button").innerHTML = login ? "Anmelden <span>→</span>" : "Account erstellen <span>→</span>";
  $("#password-input").autocomplete = login ? "current-password" : "new-password";
}
function openGame(payload) {
  state = payload.state;
  ensureStateShape();
  synchronize();
  $("#commander-name").textContent = state.commander;
  $("#commander-gate").classList.add("hidden");
  $("#app").classList.remove("is-hidden");
  render();
  fetchLeaderboard();
  save({ quiet: true });
}
async function enterGame(name, password) {
  const button = $("#start-button");
  button.disabled = true;
  button.textContent = authMode === "login" ? "Anmeldung läuft …" : "Account wird erstellt …";
  try {
    const response = await fetch(`/api/auth/${authMode}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ username: name, password }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Verbindung fehlgeschlagen");
    openGame(payload);
  } catch (error) {
    toast(error.message || "Der Spielserver antwortet nicht. Starte ihn und lade die Seite neu.", true);
  } finally {
    button.disabled = false;
    button.innerHTML = authMode === "login" ? "Anmelden <span>→</span>" : "Account erstellen <span>→</span>";
  }
}
async function restoreSession() {
  try {
    const response = await fetch("/api/session", { credentials: "same-origin" });
    if (!response.ok) return;
    openGame(await response.json());
  } catch { /* The access screen remains visible if the server is unavailable. */ }
}
async function logout() {
  await save({ quiet: true });
  try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch { /* Local UI can still close the session. */ }
  state = null;
  $("#app").classList.add("is-hidden");
  $("#commander-gate").classList.remove("hidden");
  $("#password-input").value = "";
  setGateMode("login");
}

function resourceTicker() {
  const rate = production();
  const energy = energyStats();
  const blocks = Object.entries(RESOURCE_LABELS).map(([key, label]) => {
    const cap = storageCap(key);
    return `<div class="resource"><div class="resource-top"><span>${label}</span><span class="positive">+${formatNumber(rate[key])}/h</span></div><strong>${formatNumber(state.resources[key])} <small>/ ${formatNumber(cap)}</small></strong></div>`;
  });
  blocks.push(`<div class="resource"><div class="resource-top"><span>Energie</span><span class="${energy.net >= 0 ? "positive" : "warning"}">${energy.net >= 0 ? "stabil" : "Defizit"}</span></div><strong>${formatNumber(energy.supply)} <small>/ ${formatNumber(energy.demand)}</small></strong></div>`);
  $("#resource-ticker").innerHTML = blocks.join("");
}

function queueRows() {
  const queued = [
    ...buildingQueue().map((queue, index) => ({ kind: "building", queue, index })),
    ...["research", "ship"].filter((kind) => state.queues[kind]).map((kind) => ({ kind, queue: state.queues[kind], index: 0 })),
  ];
  if (!queued.length) return `<div class="empty-state"><strong>Keine aktiven Aufträge</strong>Ressourcen werden weiter erzeugt, während du planst.</div>`;
  const now = Date.now();
  return `<div class="queue-stack">${queued.map(({ kind, queue, index }) => {
    const config = kind === "building" ? BUILDINGS[queue.key] : kind === "research" ? RESEARCH[queue.key] : SHIPS[queue.key];
    const waiting = kind === "building" && index > 0;
    const total = (queue.completesAt || now) - (queue.startedAt || now);
    const percent = waiting ? 0 : Math.max(0, Math.min(100, ((now - queue.startedAt) / total) * 100));
    const label = kind === "building" ? `Stufe ${queue.targetLevel}` : kind === "research" ? `Stufe ${queue.targetLevel}` : `${queue.amount} Einheit`;
    const timing = waiting ? `Position ${index + 1} · wartet` : formatDuration(queue.completesAt - now);
    return `<div class="queue-row ${waiting ? "waiting" : ""}"><div class="queue-top"><strong>${escapeHtml(config.name)} <span>· ${label}</span></strong><span>${timing}</span></div><div class="progress"><i style="width:${percent}%"></i></div></div>`;
  }).join("")}</div>`;
}

function overviewView() {
  const energy = energyStats();
  const rate = production();
  const planet = activePlanet();
  return `
    <section class="view-heading"><div><span class="eyebrow">KOMMANDOÜBERSICHT</span><h1>Guten Flug, ${escapeHtml(state.commander)}.</h1><p>${escapeHtml(planet.name)} produziert weiter, auch wenn du nicht im Kontrollraum bist. Dein nächster Meilenstein ist die automatisierte Industrie.</p></div><span class="sector-label">${escapeHtml(planet.coordinates)} · LIVE</span></section>
    <div class="grid overview-grid">
      <section class="panel hero-panel">${planetArtMarkup(planet, "hero-planet-art")}<span class="eyebrow">${planet.homeworld ? "HEIMATWELT" : "KOLONIE"} · ${escapeHtml(planet.classification)}</span><h2>${escapeHtml(planet.name)} ist ${planetSizeLabel(planet.fields).toLowerCase()}.</h2><p>${escapeHtml((PLANET_TYPES[planet.type] || PLANET_TYPES.temperate).terrain)} · <strong>${formatNumber(planet.fields)} Baufelder</strong>, davon ${formatNumber(fieldUsage(planet))} belegt.</p><div class="field-meter"><span><b>${formatNumber(fieldUsage(planet))}</b> / ${formatNumber(planet.fields)} Baufelder · ${buildingQueue().length} reserviert</span><i style="width:${(fieldUsage(planet) / planet.fields) * 100}%"></i></div><div class="metric-row"><div class="metric"><span>Imperiumswert</span><strong>${formatNumber(playerScore())}</strong></div><div class="metric"><span>Gebäude</span><strong>${Object.values(state.buildings).reduce((sum, level) => sum + level, 0)}</strong></div><div class="metric"><span>Planeten</span><strong>${state.planets.length}</strong></div></div></section>
      <section class="panel"><div class="panel-inner"><div class="panel-title"><h2>Aktive Aufträge</h2><span>${buildingQueue().length ? `${buildingQueue().length} BAU` : "ECHTZEIT"}</span></div>${queueRows()}</div></section>
      <section class="panel"><div class="panel-inner"><div class="panel-title"><h2>Industrieprotokoll</h2><span>PRO STUNDE</span></div><div class="stat-list"><div class="stat-line"><span>Metallförderung</span><strong>+${formatNumber(rate.metal)}</strong></div><div class="stat-line"><span>Kristallförderung</span><strong>+${formatNumber(rate.crystal)}</strong></div><div class="stat-line"><span>Tritiumproduktion</span><strong>+${formatNumber(rate.tritium)}</strong></div><div class="stat-line"><span>Mineneffizienz</span><strong class="${energy.efficiency === 1 ? "energy-good" : "energy-warning"}">${formatNumber(energy.efficiency * 100)}%</strong></div></div></div></section>
      <section class="panel"><div class="panel-inner"><div class="panel-title"><h2>Nächste Upgrades</h2><span>ROUTE</span></div>${upgradePathMarkup()}</div></section>
    </div>
    <section class="panel" style="margin-top:15px"><div class="panel-inner"><div class="panel-title"><h2>Planetare Registrierung</h2><span>${state.planets.length} WELT${state.planets.length === 1 ? "" : "EN"}</span></div>${planetRegistryMarkup()}</div></section>
    <div class="tip" style="margin-top:15px"><b>Strategiehinweis</b><span>${strategyTip()}</span></div>`;
}
function upgradePathMarkup() {
  const steps = [
    { label: "Roboterfabrik", target: "Stufe 2", done: state.buildings.roboticsFactory >= 2 },
    { label: "Forschungslabor", target: "Stufe 1", done: state.buildings.researchLab >= 1 },
    { label: "Energietechnik", target: "Stufe 1", done: state.research.energyTech >= 1 },
    { label: "Verbrennungsantrieb", target: "Stufe 1", done: state.research.combustionDrive >= 1 },
    { label: "Orbitalwerft", target: "Stufe 2", done: state.buildings.shipyard >= 2 },
    { label: "Frachtdrohne", target: "1 Einheit", done: state.ships.cargoDrone >= 1 },
  ];
  return `<ol class="upgrade-path">${steps.map((step) => `<li class="${step.done ? "done" : ""}"><span>${step.done ? "✓" : "○"}</span><strong>${step.label}</strong><small>${step.target}</small></li>`).join("")}</ol>`;
}
function planetRegistryMarkup() {
  return `<div class="planet-registry">${state.planets.map((planet) => { const usage = fieldUsage(planet); return `<article class="planet-mini-card ${planet.id === activePlanet().id ? "active" : ""}">${planetArtMarkup(planet, "planet-mini-art")}<div><span class="badge">${escapeHtml(planet.classification)}</span><h3>${escapeHtml(planet.name)}</h3><p>${escapeHtml(planet.coordinates)}</p><strong>${formatNumber(usage)} / ${formatNumber(planet.fields)} Baufelder</strong></div></article>`; }).join("")}</div>`;
}
function rankingMarkup() {
  if (!leaderboard.length) return `<div class="empty-state">Noch keine weiteren Signaturen im Sektor.</div>`;
  return `<div class="ranking">${leaderboard.map((entry, index) => `<div class="ranking-row"><span>${index + 1}</span><strong>${escapeHtml(entry.commander)}</strong><em>${formatNumber(entry.score)} Pkt.</em></div>`).join("")}</div>`;
}
function strategyTip() {
  const e = energyStats();
  if (e.net < 0) return "Deine Minen arbeiten wegen des Energieengpasses gedrosselt. Ein Solarkraftwerk bringt die Produktion wieder auf 100 %.";
  if (state.buildings.roboticsFactory < 2) return "Eine Roboterfabrik auf Stufe 2 öffnet den Weg zu Forschungslabor und Orbitalwerft.";
  if (state.buildings.researchLab < 1) return "Eröffne ein Forschungslabor und entwickle Energietechnik für effizientere Solarkraftwerke.";
  if (state.research.combustionDrive < 1) return "Erforsche den Verbrennungsantrieb. Damit schaltest du die erste Frachtdrohne frei.";
  if (state.ships.cargoDrone < 1) return "Baue eine Frachtdrohne und schicke sie zur verlassenen Raffinerie im Nachbarorbit.";
  return "Deine Kernsysteme sind einsatzbereit. Bergungseinsätze finanzieren die nächste Ausbaustufe.";
}

function entityCard(kind, key, config, level, cost, requirements, queueKind) {
  const isBuilding = queueKind === "building";
  const queue = isBuilding ? buildingQueue() : state.queues[queueKind];
  const isCurrent = isBuilding ? queue.some((item) => item.key === key) : queue?.key === key;
  const locked = requirements.some((item) => !item.ok);
  const affordable = hasResources(cost);
  const noFields = isBuilding && !hasFreeFields(config);
  const blockedByQueue = !isBuilding && Boolean(queue);
  const disabled = locked || !affordable || blockedByQueue || noFields;
  const action = blockedByQueue ? "Warteschlange belegt" : locked ? "Voraussetzung fehlt" : noFields ? "Keine Baufelder frei" : affordable ? (isBuilding ? "+1 einreihen" : "In Auftrag geben") : "Rohstoffe fehlen";
  const target = isBuilding ? projectedBuildingLevel(key) + 1 : level + 1;
  const queueNote = isBuilding && isCurrent ? `<span class="queue-badge">${queue.filter((item) => item.key === key).length} geplant</span>` : "";
  const actions = isBuilding
    ? `<div class="build-actions"><button class="${locked || noFields ? "secondary-button" : "primary-button"}" data-build="${key}" ${disabled ? "disabled" : ""}>${action}</button><button class="secondary-button" data-build-batch="${key}" data-amount="3" ${disabled ? "disabled" : ""}>+3 planen</button></div>`
    : `<button class="${locked || noFields ? "secondary-button" : "primary-button"}" data-${kind}="${key}" ${disabled ? "disabled" : ""}>${action}</button>`;
  return `<article class="entity-card ${locked || noFields ? "locked" : ""}"><img class="entity-art" src="${config.image}" alt="Illustration ${escapeHtml(config.name)}"><div class="entity-icon">${config.icon}</div><div class="entity-info"><h2>${escapeHtml(config.name)} ${queueNote}</h2><p>${escapeHtml(config.description)}</p><div class="meta"><span>${config.detail(level)}</span>${isBuilding ? `<span>Felder: ${config.fieldCost}</span>` : ""}${isBuilding && ["metalMine", "crystalMine", "tritiumSynthesizer"].includes(key) ? `<span class="negative">Energie: ${formatNumber(energyUseFor(key, target))}</span>` : ""}</div>${locked ? `<div class="unlock-note">${requirements.filter((item) => !item.ok).map((item) => item.text).join(" · ")}</div>` : noFields ? `<div class="unlock-note">Nicht genügend freie Baufelder auf ${escapeHtml(activePlanet().name)}.</div>` : ""}</div><div class="entity-action"><div class="level">Aktuell <strong>${level}</strong> → <strong>${target}</strong></div><p class="cost">${costMarkup(cost)}<br><span>Erster Abschluss in ${formatDuration(isBuilding ? buildTime(cost) : researchTime(cost))}</span></p>${actions}</div></article>`;
}
function energyUseFor(key, level) {
  if (key === "metalMine" || key === "crystalMine") return Math.floor(10 * level * 1.1 ** level);
  if (key === "tritiumSynthesizer") return Math.floor(20 * level * 1.1 ** level);
  return 0;
}
function buildingsView() {
  const economy = Object.entries(BUILDINGS).filter(([, item]) => item.group === "Ökonomie");
  const infrastructure = Object.entries(BUILDINGS).filter(([, item]) => item.group === "Infrastruktur");
  const projected = projectedBuildingState();
  const makeGroup = (title, entries) => `<section class="entity-list"><div class="panel-title"><h2>${title}</h2><span>${title === "Ökonomie" ? "PRODUKTION UND ENERGIE" : "KOLONIALE SYSTEME"}</span></div>${entries.map(([key, config]) => { const level = state.buildings[key]; const cost = getCost(config, projected.buildings[key] + 1); const requirements = config.requires ? config.requires(projected) : []; return entityCard("build", key, config, level, cost, requirements, "building"); }).join("")}</section>`;
  return `<section class="view-heading"><div><span class="eyebrow">PLANETARE INFRASTRUKTUR</span><h1>Ausbauplan für Vesta Prime</h1><p>Plane bis zu mehrere Ausbauten vor: Kosten und Baufelder werden sofort reserviert, der erste Countdown startet direkt.</p></div><span class="sector-label">${formatNumber(fieldUsage())} / ${formatNumber(activePlanet().fields)} FELDER · ${buildingQueue().length} IN BAUREIHE</span></section><div class="grid two-column">${makeGroup("Ökonomie", economy)}${makeGroup("Infrastruktur", infrastructure)}</div>`;
}
function researchView() {
  return `<section class="view-heading"><div><span class="eyebrow">FORSCHUNGSNETZWERK</span><h1>Technologien, die eine Kolonie tragen.</h1><p>Forschung läuft parallel zum Gebäudebau. Jedes Laborlevel verkürzt die Laufzeit eines Projekts.</p></div><span class="sector-label">LABOR STUFE ${state.buildings.researchLab}</span></section><section class="entity-list">${Object.entries(RESEARCH).map(([key, config]) => { const level = state.research[key]; const cost = getCost(config, level + 1); return entityCard("research", key, config, level, cost, config.requires(state), "research"); }).join("")}</section>`;
}
function shipCard(key, ship) {
  const queue = state.queues.ship;
  const locked = ship.requires(state).some((item) => !item.ok);
  const affordable = hasResources(ship.cost);
  const disabled = locked || !affordable || Boolean(queue);
  const action = queue?.key === key ? "Im Bau" : queue ? "Werft belegt" : locked ? "Voraussetzung fehlt" : affordable ? "Einheit bauen" : "Rohstoffe fehlen";
  const needs = ship.requires(state).filter((item) => !item.ok).map((item) => item.text);
  return `<article class="entity-card ${locked ? "locked" : ""}"><img class="entity-art" src="${ship.image}" alt="Illustration ${escapeHtml(ship.name)}"><div class="entity-icon">${ship.icon}</div><div class="entity-info"><h2>${ship.name} <span class="badge">verfügbar: ${state.ships[key]}</span></h2><p>${ship.description}</p><div class="meta"><span>${ship.stats}</span><span>Werftzeit: ${formatDuration(shipTime(ship.cost))}</span></div>${needs.length ? `<div class="unlock-note">${needs.join(" · ")}</div>` : ""}</div><div class="entity-action"><p class="cost">${costMarkup(ship.cost)}</p><button class="${locked ? "secondary-button" : "primary-button"}" data-ship="${key}" ${disabled ? "disabled" : ""}>${action}</button></div></article>`;
}
function shipyardView() {
  const deployed = state.missions.reduce((total, mission) => total + Object.values(mission.fleet).reduce((sum, count) => sum + count, 0), 0);
  return `<section class="view-heading"><div><span class="eyebrow">ORBITALWERFT</span><h1>Flotten für den Grenzraum.</h1><p>Die Werft fertigt eine Einheit nach der anderen. Ausgesandte Schiffe stehen erst nach ihrem Rückflug wieder zur Verfügung.</p></div><span class="sector-label">IM EINSATZ ${deployed}</span></section><section class="entity-list">${Object.entries(SHIPS).map(([key, ship]) => shipCard(key, ship)).join("")}</section><div class="tip" style="margin-top:15px"><b>Kampfsystem</b><span>Interzeptoren liefern 45 Kampfstärke, Frachtdrohnen 4. Avionik erhöht die Einsatzstärke um 8 % pro Stufe.</span></div>`;
}
function missionStatusMarkup() {
  if (!state.missions.length) return `<div class="empty-state"><strong>Keine Flotten unterwegs</strong>Baue eine Frachtdrohne und beginne deine erste Bergung.</div>`;
  const now = Date.now();
  return `<div class="queue-stack">${state.missions.map((mission) => { const target = MISSIONS[mission.targetId]; const end = mission.phase === "outgoing" ? mission.arrivesAt : mission.returnAt; const start = mission.phase === "outgoing" ? mission.departedAt : mission.arrivesAt; const p = Math.min(100, Math.max(0, (now - start) / (end - start) * 100)); return `<div class="queue-row"><div class="queue-top"><strong>${escapeHtml(target.name)} <span>· ${mission.phase === "outgoing" ? "Anflug" : "Rückflug"}</span></strong><span>${formatDuration(end - now)}</span></div><div class="progress"><i style="width:${p}%"></i></div></div>`; }).join("")}</div>`;
}
function galaxyView() {
  return `<section class="view-heading"><div><span class="eyebrow">GALAXIE 02 · SEKTOR 17</span><h1>Der Grenzraum ist offen.</h1><p>Bergungsziele sind vorab bekannt. Bei einer Kolonisierung bleibt die Planetengröße bis zur Landung ein Risiko - oder eine große Chance.</p></div><span class="sector-label">ANTRIEBSLEVEL ${state.research.combustionDrive}</span></section><div class="grid overview-grid"><section class="galaxy-map"><div class="world-marker home"></div><span class="map-label" style="left:43%;top:60%">Vesta Prime<small>Heimatwelt</small></span><div class="world-marker neutral" style="left:72%;top:26%"></div><span class="map-label" style="left:73%;top:32%">Raffinerie<small>Orbit 07</small></span><div class="world-marker neutral" style="left:21%;top:66%"></div><span class="map-label" style="left:22%;top:72%">Relais Kappa<small>Orbit 03</small></span><div class="world-marker enemy" style="left:75%;top:72%"></div><span class="map-label" style="left:76%;top:78%">Rho<small>Piraten</small></span><div class="world-marker unknown" style="left:48%;top:18%">?</div><span class="map-label" style="left:49%;top:24%">Unkartiert<small>Sensoren gestört</small></span></section><section class="panel"><div class="panel-inner"><div class="panel-title"><h2>Flottenstatus</h2><span>${state.missions.length} AKTIV</span></div>${missionStatusMarkup()}</div></section></div><section class="mission-list" style="margin-top:16px">${Object.values(MISSIONS).map((mission) => missionCard(mission)).join("")}</section>`;
}
function missionCard(mission) {
  const hasCargo = state.ships.cargoDrone > 0;
  const hasInterceptor = state.ships.interceptor > 0;
  const hasColonyShip = state.ships.colonyShip > 0;
  const colonization = Boolean(mission.colonization);
  const needsInterceptor = mission.defense >= 45;
  const viable = colonization ? hasColonyShip : needsInterceptor ? hasInterceptor : hasCargo || hasInterceptor;
  const busy = state.missions.length >= 2;
  const shipNote = colonization ? "Erfordert 1 Kolonieschiff" : needsInterceptor ? "Erfordert 1 Interzeptor" : "Erfordert 1 Frachtdrohne oder Interzeptor";
  const reward = Object.entries(mission.reward).map(([key, value]) => `${formatNumber(value)} ${RESOURCE_SYMBOLS[key]}`).join(" · ");
  const outcome = colonization ? "UNBEKANNT: 96 bis 390 Baufelder" : `BEUTE: ${reward}`;
  return `<article class="mission-card ${colonization ? "colonization" : ""}"><div><span class="badge">${mission.kind}</span><h2 style="margin-top:8px">${mission.name}</h2><p>${mission.description}</p><span class="risk">${colonization ? "Planetengröße vor Landung verborgen" : `Abwehrstärke ${mission.defense}`} · ${shipNote}</span><br><span class="reward">${outcome}</span></div><button class="primary-button" data-mission="${mission.id}" ${!viable || busy ? "disabled" : ""}>${busy ? "Max. Einsätze aktiv" : viable ? (colonization ? "Kolonie gründen" : "Flotte entsenden") : "Flotte erforderlich"}</button></article>`;
}
function logView() {
  return `<section class="view-heading"><div><span class="eyebrow">EREIGNISSPEICHER</span><h1>Flugdaten und Industrieprotokoll.</h1><p>Die jüngsten achtzig Ereignisse bleiben im serverseitigen Spielstand erhalten.</p></div><span class="sector-label">${state.log.length} EINTRÄGE</span></section><section class="log-list">${state.log.map((entry) => `<article class="log-row ${escapeHtml(entry.type)}"><time>${new Date(entry.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span>${escapeHtml(entry.text)}</span></article>`).join("")}</section>`;
}
function render() {
  if (!state) return;
  resourceTicker();
  $("#commander-name").textContent = state.commander;
  $$("#nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
  const views = { overview: overviewView, buildings: buildingsView, research: researchView, shipyard: shipyardView, galaxy: galaxyView, log: logView };
  content.innerHTML = views[activeView]();
}

function startBuilding(key, amount = 1) {
  synchronize();
  const config = BUILDINGS[key];
  let added = 0;
  for (let index = 0; index < amount; index += 1) {
    const projected = projectedBuildingState();
    const targetLevel = projected.buildings[key] + 1;
    const requirements = config.requires ? config.requires(projected) : [];
    const cost = getCost(config, targetLevel);
    if (requirements.some((item) => !item.ok) || !hasResources(cost) || !hasFreeFields(config)) break;
    pay(cost);
    state.queues.building.push({ key, targetLevel, cost, fieldCost: config.fieldCost, queuedAt: Date.now() });
    added += 1;
  }
  if (!added) return;
  activateNextBuilding(Date.now());
  const plural = added > 1 ? ` (${added} Ausbauten)` : "";
  addLog("system", `${config.name} in die Baureihe aufgenommen${plural}.`);
  toast(`${config.name}: ${added} Auftrag${added > 1 ? "e" : ""} in der Baureihe.`);
  render();
  save({ quiet: true });
}
function startResearch(key) {
  synchronize();
  const config = RESEARCH[key];
  const level = state.research[key];
  const requirements = config.requires(state);
  const cost = getCost(config, level + 1);
  if (state.queues.research || requirements.some((item) => !item.ok) || !hasResources(cost)) return;
  pay(cost);
  const startedAt = Date.now();
  state.queues.research = { key, targetLevel: level + 1, startedAt, completesAt: startedAt + researchTime(cost) };
  addLog("system", `${config.name} auf Stufe ${level + 1} angestoßen.`);
  toast(`${config.name} wird erforscht.`);
  render();
  save({ quiet: true });
}
function startShip(key) {
  synchronize();
  const ship = SHIPS[key];
  if (state.queues.ship || ship.requires(state).some((item) => !item.ok) || !hasResources(ship.cost)) return;
  pay(ship.cost);
  const startedAt = Date.now();
  state.queues.ship = { key, amount: 1, startedAt, completesAt: startedAt + shipTime(ship.cost) };
  addLog("system", `${ship.name} in der Orbitalwerft in Auftrag gegeben.`);
  toast(`${ship.name} wird montiert.`);
  render();
  save({ quiet: true });
}
function startMission(targetId) {
  synchronize();
  const target = MISSIONS[targetId];
  const useInterceptor = target.defense >= 45;
  const selectedShip = target.colonization ? "colonyShip" : useInterceptor ? "interceptor" : state.ships.cargoDrone > 0 ? "cargoDrone" : "interceptor";
  if (!state.ships[selectedShip] || state.missions.length >= 2) return;
  state.ships[selectedShip] -= 1;
  const drive = 1 + state.research.combustionDrive * .12;
  const duration = Math.round((target.minutes * 60_000) / drive);
  const departedAt = Date.now();
  state.missions.push({ id: `${targetId}-${departedAt}`, targetId, departedAt, arrivesAt: departedAt + duration, duration, phase: "outgoing", fleet: { cargoDrone: selectedShip === "cargoDrone" ? 1 : 0, interceptor: selectedShip === "interceptor" ? 1 : 0, colonyShip: selectedShip === "colonyShip" ? 1 : 0 } });
  addLog("mission", `${SHIPS[selectedShip].name} nach ${target.name} entsandt.`);
  toast(`Flotte auf Kurs: ${target.name}.`);
  render();
  save({ quiet: true });
}
function pay(cost) { for (const resource of Object.keys(RESOURCE_LABELS)) state.resources[resource] = Math.max(0, state.resources[resource] - (cost[resource] || 0)); }
function toast(message, error = false) {
  const element = document.createElement("div");
  element.className = `toast${error ? " error" : ""}`;
  element.textContent = message;
  $("#toast-region").append(element);
  setTimeout(() => element.remove(), 3600);
}

$("#nav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (!button) return;
  activeView = button.dataset.view;
  render();
  content.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (activeView === "overview") fetchLeaderboard();
});
content.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.dataset.build) startBuilding(button.dataset.build);
  if (button.dataset.buildBatch) startBuilding(button.dataset.buildBatch, Number(button.dataset.amount) || 3);
  if (button.dataset.research) startResearch(button.dataset.research);
  if (button.dataset.ship) startShip(button.dataset.ship);
  if (button.dataset.mission) startMission(button.dataset.mission);
});
$$('[data-auth-mode]').forEach((button) => button.addEventListener("click", () => setGateMode(button.dataset.authMode)));
$("#start-button").addEventListener("click", () => enterGame($("#commander-input").value, $("#password-input").value));
$("#password-input").addEventListener("keydown", (event) => { if (event.key === "Enter") enterGame($("#commander-input").value, event.currentTarget.value); });
$("#save-button").addEventListener("click", () => save());
$("#logout-button").addEventListener("click", logout);

setGateMode("register");
restoreSession();
setInterval(() => {
  if (!state) return;
  synchronize();
  render();
  if (Date.now() % 5_000 < 1300) save({ quiet: true });
  if (activeView === "overview") fetchLeaderboard();
}, 1000);
window.addEventListener("beforeunload", () => { if (state) save({ quiet: true }); });
