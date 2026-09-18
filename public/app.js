import { FLEET, DEFENSE } from "./units.js";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const content = $("#content");

const RESOURCE_LABELS = { metal: "Metall", crystal: "Kristall", tritium: "Tritium" };
// Embedded icons avoid missing asset paths and reload flicker during resource updates.
const RESOURCE_ICONS = {"metal":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20role%3D%22img%22%20aria-label%3D%22Drei%20Metallbarren%22%3E%0A%20%20%3Cdefs%3E%3ClinearGradient%20id%3D%22steel%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fbffff%22%2F%3E%3Cstop%20offset%3D%22.35%22%20stop-color%3D%22%239eb6bf%22%2F%3E%3Cstop%20offset%3D%22.72%22%20stop-color%3D%22%23526c78%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23c9dde1%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%221.4%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%20%20%3Cg%20stroke%3D%22%23dceef0%22%20stroke-width%3D%221.2%22%20stroke-linejoin%3D%22round%22%20filter%3D%22url(%23glow)%22%3E%3Cpath%20fill%3D%22url(%23steel)%22%20d%3D%22m12%2037%209-9h27l7%209-8%209H20z%22%2F%3E%3Cpath%20fill%3D%22url(%23steel)%22%20d%3D%22m8%2047%209-9h27l7%209-8%209H16z%22%2F%3E%3Cpath%20fill%3D%22url(%23steel)%22%20d%3D%22m16%2027%209-9h27l7%209-8%209H24z%22%2F%3E%3C%2Fg%3E%0A%20%20%3Cpath%20d%3D%22M25%2022h22l3%204H22zM21%2041h23l3%204H18z%22%20fill%3D%22%23fff%22%20opacity%3D%22.45%22%2F%3E%0A%3C%2Fsvg%3E%0A","tritium":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20role%3D%22img%22%20aria-label%3D%22Tritium-Reagenzglas%22%3E%0A%20%20%3Cdefs%3E%3ClinearGradient%20id%3D%22glass%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23efffff%22%2F%3E%3Cstop%20offset%3D%22.42%22%20stop-color%3D%22%239ac0c8%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23385a63%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22acid%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23d5ff69%22%2F%3E%3Cstop%20offset%3D%22.35%22%20stop-color%3D%22%2375ef31%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%231c9a3a%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22neon%22%3E%3CfeGaussianBlur%20stdDeviation%3D%222.1%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%20%20%3Cg%20filter%3D%22url(%23neon)%22%3E%3Cpath%20d%3D%22M24%207h16v7l-4%205v28c0%207-5%2010-12%2010s-12-3-12-10V19l4-5V7h8z%22%20fill%3D%22url(%23glass)%22%20stroke%3D%22%23d8ffff%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M15%2036h18v11c0%205-3%207-9%207s-9-2-9-7z%22%20fill%3D%22url(%23acid)%22%2F%3E%3Cpath%20d%3D%22M17%2042c4-3%209%203%2016-1v6c0%205-3%207-9%207s-9-2-9-7z%22%20fill%3D%22%2353cb35%22%20opacity%3D%22.8%22%2F%3E%3Ccircle%20cx%3D%2227%22%20cy%3D%2229%22%20r%3D%222%22%20fill%3D%22%23bfff76%22%2F%3E%3Ccircle%20cx%3D%2222%22%20cy%3D%2239%22%20r%3D%221.6%22%20fill%3D%22%23e1ff9d%22%2F%3E%3C%2Fg%3E%3Cpath%20d%3D%22M18%2010h20M20%2017h16%22%20stroke%3D%22%23e9ffff%22%20stroke-width%3D%222%22%20opacity%3D%22.75%22%2F%3E%0A%3C%2Fsvg%3E%0A","crystal":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20role%3D%22img%22%20aria-label%3D%22Blauer%20Bergkristall%22%3E%0A%20%20%3Cdefs%3E%3ClinearGradient%20id%3D%22blue%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23e9ffff%22%2F%3E%3Cstop%20offset%3D%22.28%22%20stop-color%3D%22%238df1ff%22%2F%3E%3Cstop%20offset%3D%22.65%22%20stop-color%3D%22%23298bff%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23174782%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22g%22%3E%3CfeGaussianBlur%20stdDeviation%3D%222%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%20%20%3Cg%20fill%3D%22url(%23blue)%22%20stroke%3D%22%23b9fbff%22%20stroke-width%3D%221.25%22%20stroke-linejoin%3D%22round%22%20filter%3D%22url(%23g)%22%3E%3Cpath%20d%3D%22m30%207%2012%2018-7%2030H20l-7-24z%22%2F%3E%3Cpath%20d%3D%22m15%2023%2012%2011-4%2022H9L5%2036z%22%2F%3E%3Cpath%20d%3D%22m44%2020%2013%2018-5%2018H37l-4-21z%22%2F%3E%3C%2Fg%3E%0A%20%20%3Cpath%20d%3D%22m30%207-2%2045%2014-27zM15%2023l8%2033%204-22zM44%2020l-3%2031%2016-13z%22%20fill%3D%22%23fff%22%20opacity%3D%22.28%22%2F%3E%0A%3C%2Fsvg%3E%0A"};
const LEVEL_CAP = 100;

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
    icon: "▣", image: "/assets/resource-vault.svg", fieldCost: 2, name: "Metallspeicher", group: "Infrastruktur", factor: 1.65, base: { metal: 200, crystal: 90 },
    description: "Erhöht die Lagergrenze für Metall deutlich.",
    detail: (level) => `Kapazität: ${formatNumber(storageCap("metal", level))}`,
  },
  crystalStorage: {
    icon: "▤", image: "/assets/resource-vault.svg", fieldCost: 2, name: "Kristallspeicher", group: "Infrastruktur", factor: 1.65, base: { metal: 180, crystal: 120 },
    description: "Sichert die empfindlichen Kristallreserven der Kolonie.",
    detail: (level) => `Kapazität: ${formatNumber(storageCap("crystal", level))}`,
  },
  tritiumStorage: {
    icon: "▥", image: "/assets/resource-vault.svg", fieldCost: 2, name: "Tritiumtanks", group: "Infrastruktur", factor: 1.65, base: { metal: 250, crystal: 100 },
    description: "Erweitert die kryogene Treibstofflagerung.",
    detail: (level) => `Kapazität: ${formatNumber(storageCap("tritium", level))}`,
  },
  roboticsFactory: {
    icon: "⚙", image: "/assets/robotics-factory.svg", fieldCost: 3, name: "Roboterfabrik", group: "Infrastruktur", factor: 1.7, base: { metal: 400, crystal: 120 },
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
  deepSpaceSensors: {
    icon: "◎", image: "/assets/sensor-array.svg", name: "Tiefraumsensorik", factor: 1.65, base: { metal: 160, crystal: 240, tritium: 60 },
    description: "Erweitert den sichtbaren Raum und verbessert die Detailtiefe der Spionageberichte.",
    detail: (level) => `Sichtkreis: ${(14 + Math.min(100, level) * .78).toFixed(1)} Sektoren`,
    requires: (s) => [requirement(s.buildings.researchLab >= 1, "Forschungslabor Stufe 1")],
  },
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
  constructionEngineering: {
    icon: "⌁", image: "/assets/robotics-factory.svg", name: "Konstruktionslogistik", factor: 1.9, base: { metal: 400, crystal: 650, tritium: 200 },
    description: "Optimiert Montagepläne, Materialfluss und Schichtbetrieb für langfristige Bauprojekte.",
    detail: (level) => `Bauzeitverkürzung: +${level * 12}% Bautempo`,
    requires: (s) => [
      requirement(s.buildings.researchLab >= 2, "Forschungslabor Stufe 2"),
      requirement(s.buildings.roboticsFactory >= 4, "Roboterfabrik Stufe 4"),
    ],
  },
};

const SHIPS = {
  spyProbe: {
    icon: "◉", image: "/assets/sensor-array.svg", name: "Aufklärsonde", cost: { metal: 80, crystal: 180, tritium: 25 },
    description: "Tastet fremde Welten ab. Mehr Sonden verbessern den Bericht; gegnerische Sensorik kann Sonden abfangen.",
    stats: "Spionage · keine Kampfstärke", requires: (s) => [requirement(s.buildings.shipyard >= 1, "Orbitalwerft Stufe 1"), requirement(s.research.deepSpaceSensors >= 1, "Tiefraumsensorik Stufe 1")],
  },
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

for (const [key,item] of Object.entries(FLEET)) if (item.name) SHIPS[key] = {
  ...item, icon:key.includes("Transport") ? "▱" : "➤", image:key.includes("Transport") ? "/assets/cargo-drone.svg" : "/assets/interceptor.svg",
  description:key.includes("Transport") ? "Frachtkapazität für planetare Raubzüge." : "Schweres Kampfschiff für Angriffe und die Heimatverteidigung.",
  stats:`Stärke ${item.power} · Fracht ${item.cargo}`,
  requires:s=>[requirement(s.buildings.shipyard>=item.level,`Orbitalwerft Stufe ${item.level}`),requirement(s.research.combustionDrive>=Math.ceil(item.level/2),`Verbrennungsantrieb Stufe ${Math.ceil(item.level/2)}`)]
};
for (const [key,item] of Object.entries(DEFENSE)) SHIPS[key] = {
  ...item, isDefense:true, icon:"⌁",image:key==="teslaCoil" ? "/assets/solar-array.svg" : "/assets/sensor-array.svg",
  stats:`Abwehr ${item.power}${item.antiSpy ? ` · Sondenabwehr +${Math.round(item.antiSpy*100)} Prozentpunkte` : ""}`,
  requires:s=>[requirement(s.buildings.shipyard>=item.level,`Orbitalwerft Stufe ${item.level}`),requirement(s.research.energyTech>=item.level,`Energietechnik Stufe ${item.level}`)]
};
const FACILITY_ATLAS = "/assets/facility-atlas-v1.png";
const FLEET_ATLAS = "/assets/fleet-atlas-v1.png";
function assignAtlas(catalog, atlas, ratio, rows, positions) {
  for (const [key, [column, row]] of Object.entries(positions)) if (catalog[key]) Object.assign(catalog[key], {
    atlas, atlasRatio:ratio, artX:`${column * -25}%`, artY:`${(row + .5) * -(100 / rows)}%`,
  });
}
assignAtlas(BUILDINGS, FACILITY_ATLAS, 1.422, 3, {
  metalMine:[0,0], crystalMine:[1,0], tritiumSynthesizer:[2,0], solarPlant:[3,0],
  metalStorage:[0,1], crystalStorage:[0,1], tritiumStorage:[0,1], roboticsFactory:[1,1],
  researchLab:[2,1], shipyard:[3,1], commandCenter:[0,2],
});
assignAtlas(RESEARCH, FACILITY_ATLAS, 1.422, 3, {
  deepSpaceSensors:[1,2], energyTech:[2,0], combustionDrive:[3,1],
  avionics:[2,1], plasmaTheory:[2,1], constructionEngineering:[1,1],
});
assignAtlas(SHIPS, FLEET_ATLAS, 2.001, 2, {
  cargoDrone:[0,0], smallTransport:[1,0], mediumTransport:[2,0], largeTransport:[3,0],
  frigate:[0,1], cruiser:[1,1], battleship:[2,1], destroyer:[3,1],
});
assignAtlas(SHIPS, FACILITY_ATLAS, 1.422, 3, {
  rocketBattery:[3,2], teslaCoil:[2,2], missileDefense:[3,2], sensorJammer:[1,2],
});
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
let galaxyIntel = [];
let galaxyOrigin = { x: 50, y: 50 };
let galaxyRadius = 14;
let galaxySpan = 220;
let galaxyZoom = 1;
let raidSelection = {};
let mapGesture = null;
let suppressMapClickUntil = 0;
let galaxyOffset = { x: 0, y: 0 };
let galaxyMapInitialized = false;
let selectedSignalId = null;
let selectedOrbitTargetId = null;
let galaxyError = "";
let actionBusy = false;
let galaxyLoading = false;
let lastGalaxyFetch = 0;
let playerSearchResults = [];
let messageRecipient = "";
let messageSubject = "";

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
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
function formatClock(timestamp) {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}
function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}
function getCost(config, targetLevel) {
  const cost = {};
  for (const resource of Object.keys(RESOURCE_LABELS)) {
    cost[resource] = Math.ceil((config.base?.[resource] || 0) * config.factor ** (targetLevel - 1));
  }
  return cost;
}
function hasResources(cost) { return Object.keys(RESOURCE_LABELS).every((key) => (state.resources[key] || 0) + .001 >= (cost[key] || 0)); }
function resourceIconMarkup(key, variant = "") {
  const src = RESOURCE_ICONS[key];
  return src ? `<img class="resource-icon ${variant}" width="17" height="17" src="${src}" alt="${RESOURCE_LABELS[key] || "Ressource"}" title="${RESOURCE_LABELS[key] || "Ressource"}">` : "";
}
function costMarkup(cost) {
  return Object.entries(cost).filter(([, value]) => value > 0).map(([key, value]) => `<span class="cost-token cost-token--${key}">${resourceIconMarkup(key, "resource-icon--cost")}<b>${formatNumber(value)}</b></span>`).join("");
}
function addLog(type, text) {
  state.log.unshift({ at: Date.now(), type, text });
  state.log = state.log.slice(0, 80);
}
function calculatedHomeFields() {
  return Object.entries(state.buildings).reduce((sum, [key, level]) => sum + (level > 0 ? (BUILDINGS[key]?.fieldCost || 1) : 0), 0);
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
function hasFreeFields(config, key = "") {
  const reserved = buildingQueue().reduce((sum, item) => sum + (item.targetLevel === 1 ? (BUILDINGS[item.key]?.fieldCost || 0) : 0), 0);
  const initialConstruction = key ? projectedBuildingLevel(key) === 0 : false;
  return availableFields() - reserved >= (initialConstruction ? (config.fieldCost || 0) : 0);
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
  for (const key of Object.keys(SHIPS)) if (!SHIPS[key].isDefense) state.ships[key] ??= 0;
  for (const planet of state.planets || []) planet.defenses ??= {};
  for (const key of Object.keys(RESEARCH)) state.research[key] ??= 0;
  state.ships.spyProbe ??= 0;
  state.spyReports ??= [];
  state.combatReports ??= [];
  state.messages ??= [];
  state.notifications ??= [];
  for (const group of [state.buildings, state.research]) {
    for (const key of Object.keys(group || {})) group[key] = Math.max(0, Math.min(LEVEL_CAP, Math.floor(Number(group[key]) || 0)));
  }
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
function constructionSpeedFactor() {
  return 1 + Math.min(100, state.buildings.roboticsFactory || 0) * .08 + Math.min(100, state.research.constructionEngineering || 0) * .12;
}
function buildingQueueSchedule(now = Date.now()) {
  let cursor = now;
  return buildingQueue().map((queue, index) => {
    const duration = buildTime(queue.cost || getCost(BUILDINGS[queue.key], queue.targetLevel), queue.targetLevel);
    const start = index === 0 && queue.startedAt ? queue.startedAt : cursor;
    const end = index === 0 && queue.completesAt ? queue.completesAt : Math.max(cursor, start) + duration;
    cursor = Math.max(now, end);
    return { queue, index, start, end, duration };
  });
}
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
function entityArtMarkup(config) {
  if (config.atlas) return `<span class="entity-art atlas-art" style="--art-image:url('${config.atlas}');--art-ratio:${config.atlasRatio};--art-x:${config.artX};--art-y:${config.artY}" role="img" aria-label="Illustration ${escapeHtml(config.name)}"></span>`;
  return `<img class="entity-art" src="${config.image}" alt="Illustration ${escapeHtml(config.name)}">`;
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
function buildTime(cost, targetLevel = 1) {
  const level = Math.max(1, Number(targetLevel) || 1);
  const resourceSeconds = (cost.metal + cost.crystal + cost.tritium) / 40;
  const progressionSeconds = 45 * 1.45 ** (level - 1);
  const rawSeconds = Math.min(90 * 24 * 60 * 60, Math.max(resourceSeconds, progressionSeconds));
  const robotics = Math.min(100, state.buildings.roboticsFactory || 0);
  const logistics = Math.min(100, state.research.constructionEngineering || 0);
  const speed = 1 + robotics * .08 + logistics * .12;
  return Math.max(15000, (rawSeconds / speed) * 1000);
}
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
  next.completesAt = at + buildTime(next.cost || getCost(BUILDINGS[next.key], next.targetLevel), next.targetLevel);
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
      if (SHIPS[queue.key].isDefense) {
        const planet = state.planets.find(p=>p.id===queue.planetId) || activePlanet();
        planet.defenses ??= {};
        planet.defenses[queue.key] = (planet.defenses[queue.key] || 0) + queue.amount;
      } else state.ships[queue.key] += queue.amount;
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
  if (!state || isSaving) return false;
  isSaving = true;
  const status = $("#save-state");
  if (status) status.textContent = "speichert …";
  try {
    synchronize();
    const response = await fetch("/api/state", {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ state }),
    });
    if (response.status === 401) throw new Error("Sitzung abgelaufen");
    if (response.status === 409) {
      const latest = await fetch("/api/state");
      if (!latest.ok) throw new Error("Synchronisierung fehlgeschlagen");
      const knownNotificationIds = new Set((state.notifications || []).map((notice) => notice.id));
      state = (await latest.json()).state;
      ensureStateShape();
      const newest = state.notifications.find((notice) => !knownNotificationIds.has(notice.id));
      toast(newest ? `${newest.title}: ${newest.text}` : "Neue Ereignisse eingetroffen. Spielstand synchronisiert.", newest?.priority === "high");
      render();
      return false;
    }
    if (!response.ok) throw new Error("Speichern fehlgeschlagen");
    state.revision = (await response.json()).revision;
    if (status) status.textContent = "gespeichert";
    if (!quiet) toast("Spielstand übertragen.");
    return true;
  } catch (error) {
    if (status) status.textContent = "nicht gespeichert";
    if (!quiet) toast("Server nicht erreichbar. Bitte später erneut speichern.", true);
    return false;
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
    if (["overview", "ranking"].includes(activeView)) render();
  } catch { /* The game remains usable when the leaderboard endpoint is unavailable. */ }
}

async function fetchGalaxy({ force = false } = {}) {
  if (!state || mapGesture || galaxyLoading || (!force && Date.now() - lastGalaxyFetch < 10_000)) return;
  galaxyLoading = true;
  lastGalaxyFetch = Date.now();
  try {
    const response = await fetch("/api/galaxy", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Sensorverbindung nicht verfügbar.");
    const payload = await response.json();
    galaxyIntel = Array.isArray(payload.systems) ? payload.systems : [];
    galaxyOrigin = payload.origin;
    galaxyRadius = payload.radius;
    galaxySpan = Number(payload.span) || 220;
    if (!galaxyMapInitialized) {
      galaxyOffset = { x: galaxySpan / 2 - galaxyOrigin.x, y: galaxySpan / 2 - galaxyOrigin.y };
      galaxyMapInitialized = true;
    }
    galaxyError = "";
  } catch { galaxyError = "Sensorverbindung unterbrochen. Erneut scannen.";
  } finally {
    galaxyLoading = false;
    if (state && activeView === "galaxy" && !document.activeElement?.matches("[data-fleet-key]")) render();
  }
}

async function raidTarget(targetId) {
  if (actionBusy || isSaving) return;
  actionBusy = true;
  if (!await save({ quiet: true })) { actionBusy = false; return; }
  synchronize();
  const fleet = Object.fromEntries(Object.keys(FLEET).map(key=>[key,Math.min(state.ships[key]||0,Math.max(0,Math.floor(Number(raidSelection[key])||0)))]));
  if (!Object.values(fleet).some(Boolean)) {
    actionBusy = false;
    toast("Wähle zuerst deine Einsatzflotte im Zielfenster.", true);
    return;
  }
  try {
    const response = await fetch("/api/raids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ targetId, fleet }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Raubzug konnte nicht ausgeführt werden.");
    state = payload.state;
    ensureStateShape();
    const loot = Object.entries(payload.report.loot || {}).filter(([, value]) => value).map(([key, value]) => `${formatNumber(value)} ${RESOURCE_LABELS[key]}`).join(" · ");
    toast(payload.report.won ? `Raubzug erfolgreich${loot ? `: ${loot}` : "."}` : "Raubzug abgewehrt. Einsatzflotte hat Verluste erlitten.", !payload.report.won);
    render();
    fetchGalaxy({ force: true });
    fetchLeaderboard();
  } catch (error) {
    toast(error.message || "Der Raubzug konnte nicht ausgeführt werden.", true);
  } finally { actionBusy = false; }
}

async function spyTarget(targetId, probes) {
  if (actionBusy || isSaving) return;
  actionBusy = true;
  try {
    if (!await save({ quiet: true })) return;
    const response = await fetch("/api/spy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId, probes }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Aufklärung fehlgeschlagen.");
    state = payload.state;
    ensureStateShape();
    toast(`Bericht eingetroffen · Detailstufe ${payload.report.intelligence}/4`);
  } catch (error) { toast(error.message, true);
  } finally {
    actionBusy = false;
    render();
  }
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
    return `<div class="resource"><div class="resource-top"><span class="resource-label">${resourceIconMarkup(key, "resource-icon--ticker")}<span>${label}</span></span><span class="positive">+${formatNumber(rate[key])}/h</span></div><strong>${formatNumber(state.resources[key])} <small>/ ${formatNumber(cap)}</small></strong></div>`;
  });
  blocks.push(`<div class="resource"><div class="resource-top"><span>Energie</span><span class="${energy.net >= 0 ? "positive" : "warning"}">${energy.net >= 0 ? "stabil" : "Defizit"}</span></div><strong>${formatNumber(energy.supply)} <small>/ ${formatNumber(energy.demand)}</small></strong></div>`);
  $("#resource-ticker").innerHTML = blocks.join("");
}

function queueRows(buildingsOnly = false) {
  const now = Date.now();
  const queued = [
    ...buildingQueueSchedule(now).map(({ queue, index, start, end, duration }) => ({ kind: "building", queue, index, start, end, duration })),
    ...(buildingsOnly ? [] : ["research", "ship"].filter((kind) => state.queues[kind]).map((kind) => ({ kind, queue: state.queues[kind], index: 0 }))),
  ];
  if (!queued.length) return `<div class="empty-state"><strong>Keine aktiven Aufträge</strong>Ressourcen werden weiter erzeugt, während du planst.</div>`;
  return `<div class="queue-stack">${queued.map(({ kind, queue, index, start, end, duration }) => {
    const config = kind === "building" ? BUILDINGS[queue.key] : kind === "research" ? RESEARCH[queue.key] : SHIPS[queue.key];
    const waiting = kind === "building" && index > 0;
    const total = kind === "building" ? duration : (queue.completesAt || now) - (queue.startedAt || now);
    const percent = waiting ? 0 : Math.max(0, Math.min(100, ((now - queue.startedAt) / total) * 100));
    const label = kind === "building" ? `Stufe ${queue.targetLevel}` : kind === "research" ? `Stufe ${queue.targetLevel}` : `${queue.amount} Einheit`;
    const effectiveEnd = kind === "building" ? end : queue.completesAt;
    const timing = waiting ? `Start ${formatDateTime(start)} · Ende ${formatDateTime(end)}` : `${formatDuration(effectiveEnd - now)} · Ende ${formatDateTime(effectiveEnd)}`;
    const cancel = kind === "building" ? `<button class="queue-cancel" data-cancel-building="${index}">${waiting ? "Auftrag entfernen" : "Bau abbrechen"} · 100 % zurück</button>` : "";
    return `<div class="queue-row ${waiting ? "waiting" : ""}"><div class="queue-top"><strong>${escapeHtml(config.name)} <span>· ${label}${waiting ? ` · Position ${index + 1}` : ""}</span></strong><span>${timing}</span></div><div class="progress"><i style="width:${percent}%"></i></div>${cancel}</div>`;
  }).join("")}</div>`;
}

function notificationMarkup() {
  const notices = (state.notifications || []).slice(0, 6);
  if (!notices.length) return `<div class="empty-state"><strong>Keine neuen Warnungen</strong>Sensorik und Ereignisprotokoll überwachen deinen Sektor.</div>`;
  const icons = { scan: "◉", combat: "⚠", mission: "↗", system: "◎" };
  return `<div class="log-list notification-list">${notices.map((notice) => `<article class="log-row ${escapeHtml(notice.kind || "system")} ${notice.priority === "high" ? "notification-high" : ""}"><time>${new Date(notice.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</time><span><b>${icons[notice.kind] || "◎"} ${escapeHtml(notice.title || "Meldung")}</b><small>${escapeHtml(notice.text || "")}</small></span></article>`).join("")}</div>`;
}

function overviewView() {
  const energy = energyStats();
  const rate = production();
  const planet = activePlanet();
  const activeOrders = buildingQueue().length + (state.queues.research ? 1 : 0) + (state.queues.ship ? 1 : 0);
  return `
    <section class="view-heading"><div><span class="eyebrow">KOMMANDOÜBERSICHT</span><h1>Guten Flug, ${escapeHtml(state.commander)}.</h1><p>${escapeHtml(planet.name)} produziert weiter, auch wenn du nicht im Kontrollraum bist. Dein nächster Meilenstein ist die automatisierte Industrie.</p></div><span class="sector-label">${escapeHtml(planet.coordinates)} · LIVE</span></section>
    <div class="grid overview-grid">
      <section class="panel hero-panel">${planetArtMarkup(planet, "hero-planet-art")}<span class="eyebrow">${planet.homeworld ? "HEIMATWELT" : "KOLONIE"} · ${escapeHtml(planet.classification)}</span><h2>${escapeHtml(planet.name)} ist ${planetSizeLabel(planet.fields).toLowerCase()}.</h2><p>${escapeHtml((PLANET_TYPES[planet.type] || PLANET_TYPES.temperate).terrain)} · <strong>${formatNumber(planet.fields)} Baufelder</strong>, davon ${formatNumber(fieldUsage(planet))} belegt.</p><div class="field-meter"><span><b>${formatNumber(fieldUsage(planet))}</b> / ${formatNumber(planet.fields)} Baufelder · ${buildingQueue().length} reserviert</span><i style="width:${(fieldUsage(planet) / planet.fields) * 100}%"></i></div><div class="metric-row"><div class="metric"><span>Imperiumswert</span><strong>${formatNumber(playerScore())}</strong></div><div class="metric"><span>Gebäude</span><strong>${Object.values(state.buildings).reduce((sum, level) => sum + level, 0)}</strong></div><div class="metric"><span>Planeten</span><strong>${state.planets.length}</strong></div></div></section>
      <section class="panel"><div class="panel-inner"><div class="panel-title"><h2>Aktive Aufträge</h2><span>${activeOrders ? `${activeOrders} AUFTRÄGE` : "ECHTZEIT"}</span></div>${queueRows()}</div></section>
      <section class="panel fleet-dashboard-panel"><div class="panel-inner"><div class="panel-title"><h2>Aktive Flotten</h2><span>${state.missions.length} UNTERWEGS</span></div>${missionStatusMarkup()}</div></section>
      <section class="panel"><div class="panel-inner"><div class="panel-title"><h2>Alarmzentrale</h2><span>${state.notifications?.length || 0} MELDUNGEN</span></div>${notificationMarkup()}</div></section>
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
  return `<div class="planet-registry">${state.planets.map((planet) => { const usage = fieldUsage(planet); const active = planet.id === activePlanet().id; return `<button type="button" class="planet-mini-card ${active ? "active" : ""}" data-planet-id="${escapeHtml(planet.id)}" aria-pressed="${active}">${planetArtMarkup(planet, "planet-mini-art")}<div><span class="badge">${escapeHtml(planet.classification)}</span><h3>${escapeHtml(planet.name)}</h3><p>${escapeHtml(planet.coordinates)}</p><strong>${formatNumber(usage)} / ${formatNumber(planet.fields)} Baufelder</strong><small>${active ? "Aktive Welt" : "Welt auswählen"}</small></div></button>`; }).join("")}</div>`;
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
  const target = isBuilding ? projectedBuildingLevel(key) + 1 : level + 1;
  const atCap = target > LEVEL_CAP;
  const locked = requirements.some((item) => !item.ok);
  const affordable = hasResources(cost);
  const noFields = isBuilding && !hasFreeFields(config, key);
  const blockedByQueue = !isBuilding && Boolean(queue);
  const disabled = atCap || locked || !affordable || blockedByQueue || noFields;
  const action = atCap ? "Maximalstufe erreicht" : blockedByQueue ? "Warteschlange belegt" : locked ? "Voraussetzung fehlt" : noFields ? "Keine Baufelder frei" : affordable ? (isBuilding ? "+1 einreihen" : "In Auftrag geben") : "Rohstoffe fehlen";
  const queueNote = isBuilding && isCurrent ? `<span class="queue-badge">${queue.filter((item) => item.key === key).length} geplant</span>` : "";
  const actions = isBuilding
    ? `<div class="build-actions"><button class="${locked || noFields || atCap ? "secondary-button" : "primary-button"}" data-build="${key}" ${disabled ? "disabled" : ""}>${action}</button><button class="secondary-button" data-build-batch="${key}" data-amount="3" ${disabled ? "disabled" : ""}>+3 planen</button></div>`
    : `<button class="${locked || noFields || atCap ? "secondary-button" : "primary-button"}" data-${kind}="${key}" ${disabled ? "disabled" : ""}>${action}</button>`;
  const levelDisplay = atCap ? `<strong>${LEVEL_CAP}</strong> · MAX` : `<strong>${level}</strong> → <strong>${target}</strong>`;
  const costDisplay = atCap ? `<span>Diese Technologie hat die feste Maximalstufe erreicht.</span>` : `${costMarkup(cost)}<br><span>Erster Abschluss in ${formatDuration(isBuilding ? buildTime(cost, target) : researchTime(cost))}</span>`;
  return `<article class="entity-card entity-card--${kind} entity-card--${key} ${locked || noFields ? "locked" : ""}" style="--level-progress:${Math.min(100, level)}%">${entityArtMarkup(config)}<div class="entity-icon">${config.icon}</div><div class="entity-info"><h2>${escapeHtml(config.name)} ${queueNote}</h2><div class="level-meter" aria-label="Stufe ${level} von 100"><i></i></div><p>${escapeHtml(config.description)}</p><div class="meta"><span>${config.detail(level)}</span>${isBuilding ? `<span>Felder beim Erstbau: ${config.fieldCost}</span>` : ""}${isBuilding && ["metalMine", "crystalMine", "tritiumSynthesizer"].includes(key) ? `<span class="negative">Energie: ${formatNumber(energyUseFor(key, Math.min(target, LEVEL_CAP)))}</span>` : ""}</div>${locked ? `<div class="unlock-note">${requirements.filter((item) => !item.ok).map((item) => item.text).join(" · ")}</div>` : noFields ? `<div class="unlock-note">Nicht genügend freie Baufelder auf ${escapeHtml(activePlanet().name)}.</div>` : ""}</div><div class="entity-action"><div class="level">Aktuell ${levelDisplay}</div><p class="cost">${costDisplay}</p>${actions}</div></article>`;
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
  const schedule = buildingQueueSchedule();
  const queueEnd = schedule.at(-1)?.end;
  return `<section class="view-heading"><div><span class="eyebrow">PLANETARE INFRASTRUKTUR</span><h1>Ausbauplan für ${escapeHtml(activePlanet().name)}</h1><p>Mit jeder Stufe steigt die Bauzeit deutlich: von Sekunden über Minuten und Stunden bis zu mehreren Tagen. Roboterfabrik und Konstruktionslogistik beschleunigen die Baureihe.</p></div><span class="sector-label">${formatNumber(fieldUsage())} / ${formatNumber(activePlanet().fields)} FELDER · BAUTEMPO ${constructionSpeedFactor().toFixed(2)}×${queueEnd ? ` · FERTIG ${formatDateTime(queueEnd)}` : ""}</span></section><section class="panel queue-planning-panel"><div class="panel-inner"><div class="panel-title"><h2>Baureihe</h2><span>${buildingQueue().length ? `${buildingQueue().length} GEPLANT` : "FREI"}</span></div>${queueRows(true)}</div></section><div class="grid two-column">${makeGroup("Ökonomie", economy)}${makeGroup("Infrastruktur", infrastructure)}</div>`;
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
  return `<article class="entity-card entity-card--ship entity-card--${key} ${locked ? "locked" : ""}">${entityArtMarkup(ship)}<div class="entity-icon">${ship.icon}</div><div class="entity-info"><h2>${ship.name} <span class="badge">verfügbar: ${ship.isDefense ? (activePlanet().defenses?.[key] || 0) : state.ships[key]}</span></h2><p>${ship.description}</p><div class="meta"><span>${ship.stats}</span><span>Werftzeit: ${formatDuration(shipTime(ship.cost))}</span></div>${needs.length ? `<div class="unlock-note">${needs.join(" · ")}</div>` : ""}</div><div class="entity-action"><p class="cost">${costMarkup(ship.cost)}</p><button class="${locked ? "secondary-button" : "primary-button"}" data-ship="${key}" ${disabled ? "disabled" : ""}>${action}</button></div></article>`;
}
function defenseView() {
  return `<section class="view-heading"><h1>Planetare Verteidigung · ${escapeHtml(activePlanet().name)}</h1><p>Stationäre Anlagen bleiben auf dieser Welt. Sie verstärken die Abwehr bei Angriffen; Störsender und Raketenabwehr erhöhen das Sonden-Abfangrisiko.</p></section><section class="entity-list">${Object.entries(SHIPS).filter(([,s])=>s.isDefense).map(([key,s])=>shipCard(key,s)).join("")}</section>`;
}
function shipyardView() {
  const deployed = state.missions.reduce((total, mission) => total + Object.values(mission.fleet).reduce((sum, count) => sum + count, 0), 0);
  return `<section class="view-heading"><div><span class="eyebrow">ORBITALWERFT</span><h1>Flotten für den Grenzraum.</h1><p>Die Werft fertigt eine Einheit nach der anderen. Ausgesandte Schiffe stehen erst nach ihrem Rückflug wieder zur Verfügung.</p></div><span class="sector-label">IM EINSATZ ${deployed}</span></section><section class="entity-list">${Object.entries(SHIPS).filter(([,ship])=>!ship.isDefense).map(([key, ship]) => shipCard(key, ship)).join("")}</section><div class="tip" style="margin-top:15px"><b>Kampfsystem</b><span>Die Werte jeder Schiffsklasse gelten für planetare Angriffe. Avionik erhöht die Stärke um 8 % pro Stufe. Deine Flotte stellst du nach Auswahl einer fremden Welt zusammen.</span></div>`;
}
function missionStatusMarkup() {
  if (!state.missions.length) return `<div class="empty-state"><strong>Keine Flotten unterwegs</strong>Baue eine Frachtdrohne und beginne deine erste Bergung.</div>`;
  const now = Date.now();
  return `<div class="fleet-operations">${state.missions.map((mission) => {
    const target = MISSIONS[mission.targetId] || { name: mission.targetId, coordinates: "Unbekannt" };
    const returnAt = mission.returnAt || mission.arrivesAt + mission.duration / 2;
    const outboundDone = mission.phase === "returning";
    const outboundProgress = outboundDone ? 100 : Math.min(100, Math.max(0, (now - mission.departedAt) / (mission.arrivesAt - mission.departedAt) * 100));
    const returnProgress = outboundDone ? Math.min(100, Math.max(0, (now - mission.arrivesAt) / (returnAt - mission.arrivesAt) * 100)) : 0;
    const fleet = Object.entries(mission.fleet || {}).filter(([,count]) => count > 0).map(([key,count]) => `${count}× ${SHIPS[key]?.name || key}`).join(" · ");
    return `<section class="fleet-operation"><div class="fleet-operation-head"><div><strong>${escapeHtml(target.name)}</strong><span>${escapeHtml(target.coordinates || "")}</span></div><small>${escapeHtml(fleet || "Flottenverband")}</small></div><div class="queue-row ${outboundDone ? "completed-leg" : ""}"><div class="queue-top"><strong>Hinflug <span>· ${outboundDone ? "angekommen" : "unterwegs"}</span></strong><span>${outboundDone ? `Ankunft ${formatClock(mission.arrivesAt)}` : `${formatDuration(mission.arrivesAt - now)} · ${formatClock(mission.arrivesAt)}`}</span></div><div class="progress"><i style="width:${outboundProgress}%"></i></div></div><div class="queue-row return-leg ${outboundDone ? "active-return" : "waiting"}"><div class="queue-top"><strong>Rückflug <span>· ${outboundDone ? "unterwegs" : "geplant"}</span></strong><span>${outboundDone ? `${formatDuration(returnAt - now)} · ${formatClock(returnAt)}` : `Rückkehr ca. ${formatClock(returnAt)}`}</span></div><div class="progress"><i style="width:${returnProgress}%"></i></div></div></section>`;
  }).join("")}</div>`;
}
function currentReport(id) {
  return state.spyReports.find((report) => report.targetId === id && report.expiresAt > Date.now());
}
function galaxyCoordinates(position) { return `${position.x.toFixed(0)} : ${position.y.toFixed(0)}`; }
function reportSection(title, values, catalog) {
  if (!values) return `<div class="intel-locked"><span>◌</span> ${title} · höhere Aufklärung erforderlich</div>`;
  return `<section class="intel-section"><h3>${title}</h3><div class="intel-values">${Object.entries(values).map(([key, value]) => `<div><span>${escapeHtml(catalog[key]?.name || catalog[key] || key)}</span><strong>${formatNumber(value)}</strong></div>`).join("")}</div></section>`;
}
async function colonizeTarget(targetId) {
  if (actionBusy || isSaving) { toast("Speicherung läuft – bitte gleich erneut versuchen."); return; }
  actionBusy = true;
  try {
    if (!await save({ quiet: true })) return;
    const response = await fetch("/api/colonize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Besiedlung fehlgeschlagen.");
    state = payload.state;
    ensureStateShape();
    selectedSignalId = null;
    selectedOrbitTargetId = null;
    galaxyOffset = { x: 0, y: 0 };
    toast(`${payload.planet.name} besiedelt · ${payload.planet.fields} Baufelder`);
  } catch (error) { toast(error.message, true); }
  finally { actionBusy = false; await fetchGalaxy({ force: true }); render(); }
}
function tablePanel(title, headings, rows) {
  return `<section class="view-heading"><h1>${title}</h1></section><section class="contact-console"><table><thead><tr>${headings.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></section>`;
}
function rankingView() {
  return tablePanel("Rangliste · alle Kommandanten", ["Rang", "Kommandant", "Punktzahl", "Planeten"], leaderboard.map((p, i) => `<tr class="${p.commander === state.commander ? "selected" : ""}"><td>${i + 1}</td><td>${escapeHtml(p.commander)}</td><td>${formatNumber(p.score)}</td><td>${p.planets}</td></tr>`)) + `<p class="view-note">Punkte: 12 × Stufe² je Gebäude/Forschung + 4 je Schiff. Aktuell ${leaderboard.length} Spieler.</p>`;
}
function economyView() {
  const rates = production();
  return tablePanel("Wirtschaft", ["Rohstoff", "Vorrat", "Produktion / Stunde", "Lagerkapazität"], Object.keys(RESOURCE_LABELS).map(key => `<tr><td>${RESOURCE_LABELS[key]}</td><td>${formatNumber(state.resources[key])}</td><td>+${formatNumber(rates[key])}</td><td>${formatNumber(storageCap(key))}</td></tr>`)) + `<p class="view-note">Energieeffizienz: ${Math.round(energyStats().efficiency * 100)} %. Wirtschaft und Schiffe werden derzeit zwischen deinen Planeten geteilt; Verteidigungsanlagen sind planetengebunden.</p>`;
}
function statisticsView() {
  const categories = [["Gebäude", Object.values(state.buildings).reduce((s,n)=>s+n*n*12,0)], ["Forschung", Object.values(state.research).reduce((s,n)=>s+n*n*12,0)], ["Flotte", Object.values(state.ships).reduce((s,n)=>s+n*4,0)], ["Gesamt", playerScore()]];
  return tablePanel("Spielerstatistik", ["Bereich", "Punkte"], categories.map(([name,value]) => `<tr><td>${name}</td><td>${formatNumber(value)}</td></tr>`));
}
function fleetsView() {
  return tablePanel("Flottenbefehle", ["Schiff", "Verfügbar"], Object.entries(SHIPS).filter(([,item]) => !item.isDefense).map(([key,item]) => `<tr><td>${item.name}</td><td>${formatNumber(state.ships[key])}</td></tr>`)) + `<section class="panel panel-inner"><h2>Laufende Einsätze</h2>${missionStatusMarkup()}</section><section class="mission-list">${Object.values(MISSIONS).map(missionCard).join("")}</section><p class="view-note">Spionage, Angriffe und gezielte Besiedlung: Ziel im Sonnensystem auswählen.</p>`;
}
function techtreeView() {
  return tablePanel("Technologiebaum", ["Technologie / Einheit", "Voraussetzungen", "Status"], [...Object.values(BUILDINGS), ...Object.values(RESEARCH), ...Object.values(SHIPS)].map(item => {
    const requirements = item.requires ? item.requires(state) : [];
    return `<tr><td>${item.name}</td><td>${requirements.map(r=>`${r.ok ? "✓" : "○"} ${escapeHtml(r.text)}`).join("<br>") || "Keine"}</td><td>${requirements.every(r=>r.ok) ? "Freigeschaltet" : "Gesperrt"}</td></tr>`;
  }));
}
function helpView() {
  return `<section class="view-heading"><h1>Hilfe & Bildnachweise</h1></section><section class="panel panel-inner"><h2>Sternenkarte</h2><p>Jeder weiße Stern ist ein auswählbares Ziel. Freie Welten lassen sich mit einem Kolonieschiff besiedeln. Besetzte Welten können ausgespäht und mit gültigem Spionagebericht angegriffen werden. Die Größe freier Welten (96–390 Felder) bleibt bis zur Besiedlung verborgen.</p><h2>Grafikstil</h2><p>Die Anlagen-, Forschungs-, Verteidigungs- und Flottengrafiken wurden als eigenständige Sci-Fi-Illustrationen für Orbital Foundry erstellt. Sie greifen die Atmosphäre klassischer Weltraum-Aufbauspiele auf, ohne Originalgrafiken anderer Spiele zu verwenden.</p><p>Die Bildatlanten werden direkt vom Spielserver geladen; externe Stockfoto-Anbieter werden dafür nicht mehr benötigt.</p></section>`;
}
content.addEventListener("error", (event) => {
  if (event.target.tagName === "IMG" && event.target.src.startsWith("https://")) event.target.src = "/assets/research-lab.svg";
}, true);
function fleetSelector() {
  return `<details class="fleet-selector" open><summary>Einsatzflotte zusammenstellen</summary>${Object.entries(FLEET).map(([key,item])=>`<label><span>${SHIPS[key].name} <small>(${state.ships[key]||0} verfügbar)</small></span><input type="number" inputmode="numeric" min="0" max="${state.ships[key]||0}" step="1" value="${raidSelection[key]||0}" data-fleet-key="${key}" aria-label="${SHIPS[key].name} einsetzen"></label>`).join("")}<p>Nur die gewählten Schiffe starten. PvP-Angriffe werden derzeit sofort aufgelöst.</p></details>`;
}
function galaxyInspector() {
  const system = galaxyIntel.find((contact) => contact.id === selectedSignalId);
  if (!system) return `<aside class="galaxy-inspector"><span class="eyebrow">SYSTEMSCAN</span><div class="scanner-symbol">◎</div><h2>Wähle einen Stern</h2><p>Jeder große Lichtpunkt ist ein Sternsystem. Seine Helligkeit zeigt an, wie viele freie oder bewohnte Welten die Sensoren dort erfassen.</p><p>Ein Klick öffnet die 13 Orbitalpositionen. Spielernamen erscheinen nur im Systemfenster, nicht auf der Sternkarte.</p><div class="sensor-stat"><span>Aufklärsonden</span><strong>${state.ships.spyProbe}</strong></div></aside>`;
  const target = system.slots.find((slot) => slot.targetId === selectedOrbitTargetId);
  const slotList = `<div class="orbit-list" aria-label="Orbitalpositionen 1 bis 13">${system.slots.map((slot) => slot.empty
    ? `<div class="orbit-slot empty"><strong>${slot.position}</strong><span>Leerer Orbit</span><small>—</small></div>`
    : `<button class="orbit-slot ${slot.free ? "free" : "occupied"} ${slot.targetId === selectedOrbitTargetId ? "selected" : ""}" data-orbit-target="${escapeHtml(slot.targetId)}"><strong>${slot.position}</strong><span>${escapeHtml(slot.name)}</span><small>${slot.free ? "Frei · unbekannte Größe" : `Spieler · ${escapeHtml(slot.owner || "Unbekannt")}`}</small></button>`).join("")}</div>`;
  const summary = `<span class="eyebrow">${galaxyCoordinates(system.position)} · ${system.distance} SEKTOREN</span><h2>${escapeHtml(system.signature)}</h2><p>${system.planetCount} sichtbare Welten · ${system.occupiedCount} bewohnt · ${system.freeCount} frei</p>${slotList}`;
  if (!target) return `<aside class="galaxy-inspector">${summary}<div class="intel-locked">Wähle eine belegte Position für Spionage oder Angriff – oder eine freie Welt zur Kolonisierung.</div></aside>`;
  if (target.free) return `<aside class="galaxy-inspector">${summary}<section class="orbit-action"><span class="eyebrow">POSITION ${target.position} · FREIE WELT</span><h3>${escapeHtml(target.name)}</h3><p>Größe und Beschaffenheit werden erst bei der Besiedlung bekannt. Ein Kolonieschiff wird verbraucht.</p><button class="primary-button" data-colonize="${escapeHtml(target.targetId)}" ${!state.ships.colonyShip || actionBusy ? "disabled" : ""}>${state.ships.colonyShip ? "Kolonisieren · 1 Kolonieschiff" : "Kolonieschiff erforderlich"}</button></section></aside>`;
  const report = currentReport(target.targetId);
  const cooldown = Math.max(0, Math.ceil((15000 - (Date.now() - (state.lastSpyAt || 0))) / 1000));
  return `<aside class="galaxy-inspector">${summary}<section class="orbit-action"><span class="eyebrow">POSITION ${target.position} · BESIEDELT</span><h3>${escapeHtml(target.name)}</h3><p>Kolonie von <strong>${escapeHtml(target.owner || "Unbekannt")}</strong>. Für Wirtschaft, Flotte und Verteidigung ist weiterhin ein Sondenscan nötig.</p>
  <div class="intel-actions"><button class="primary-button" data-spy-target="${escapeHtml(target.targetId)}" data-probes="1" ${!state.ships.spyProbe || cooldown || actionBusy ? "disabled" : ""}>${cooldown ? `Sondenkanal · ${cooldown}s` : "Mit 1 Sonde ausspähen"}</button><button class="secondary-button" data-spy-target="${escapeHtml(target.targetId)}" data-probes="5" ${state.ships.spyProbe < 5 || cooldown || actionBusy ? "disabled" : ""}>Tiefenscan · 5 Sonden</button><button class="secondary-button raid-action" data-raid-target="${escapeHtml(target.targetId)}" ${!report || actionBusy || !Object.keys(FLEET).some(key=>state.ships[key]>0) ? "disabled" : ""}>Ausgewählte Flotte angreifen lassen</button></div>${fleetSelector()}
  ${report ? `<div class="report-heading"><span>AUFKLÄRUNGSBERICHT</span><strong>${report.intelligence}/5</strong></div><p>Momentaufnahme vom ${new Date(report.createdAt).toLocaleTimeString("de-DE")} · gültig für ${formatDuration(report.expiresAt - Date.now())}</p><p>Besitzer: ${escapeHtml(report.owner || "noch unbekannt")}<br>Sondenverluste: ${report.lost} / ${report.probes} · Abfangrisiko: ${report.risk}%</p>${report.world ? `<p>${escapeHtml(report.world.classification)} · ${report.world.fields} Baufelder · ${report.world.usedFields || 0} bebaut</p>` : ""}${reportSection("Rohstoffe", report.resources, RESOURCE_LABELS)}${reportSection("Flotte", report.ships, SHIPS)}${reportSection("Infrastruktur", report.buildings, BUILDINGS)}${reportSection("Forschung", report.research, RESEARCH)}${reportSection("Planetare Abwehr", report.defenses, DEFENSE)}${report.activeMissions !== null && report.activeMissions !== undefined ? `<section class="intel-section"><h3>Flottenlage</h3><div class="intel-values"><div><span>Aktive Verbände</span><strong>${formatNumber(report.activeMissions)}</strong></div></div></section>` : ""}` : `<div class="intel-locked">Keine aktuellen Daten. Ein Spionagebericht schaltet den Raubzug frei.</div>`}
  </section></aside>`;
}
function galaxyView() {
  const size = galaxySpan / galaxyZoom;
  const center = { x: galaxyOrigin.x + galaxyOffset.x, y: galaxyOrigin.y + galaxyOffset.y };
  const left = center.x - size / 2, top = center.y - size / 2;
  const point = (p) => ({ x: (p.x - left) / size * 100, y: (p.y - top) / size * 100 });
  const origin = point(galaxyOrigin);
  const selected = galaxyIntel.find(signal => signal.id === selectedSignalId);
  const target = selected ? point(selected.position) : null;
  const stars = "";
  const space = `<svg class="survey-field" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="survey-window"><circle cx="${origin.x}" cy="${origin.y}" r="${galaxyRadius / size * 100}"/></clipPath></defs><g clip-path="url(#survey-window)"><rect width="100" height="100" fill="#020309"/>${stars}</g><circle cx="${origin.x}" cy="${origin.y}" r="${galaxyRadius / size * 100}" fill="none" stroke="#73ae82" stroke-width=".12"/><path d="M ${origin.x} 0 V 100 M 0 ${origin.y} H 100" stroke="#59ba73" stroke-width=".12"/>${target ? `<path d="M ${target.x} 0 V 100 M 0 ${target.y} H 100" stroke="#e16e87" stroke-width=".15"/>` : ""}</svg>`;
  const markers = galaxyIntel.map((system) => {
    const p = point(system.position);
    if (p.x < 2 || p.x > 97 || p.y < 3 || p.y > 95) return "";
    return `<button class="signal-point system-signal ${system.id === selectedSignalId ? "selected" : ""}" style="left:${p.x}%;top:${p.y}%;--star-size:${system.starSize}px;--star-light:${system.luminosity}" data-signal-id="${escapeHtml(system.id)}" aria-label="${escapeHtml(system.signature)} mit ${system.planetCount} sichtbaren Welten bei ${galaxyCoordinates(system.position)}"><i></i><span>${escapeHtml(system.signature)} · ${system.planetCount} Welten</span></button>`;
  }).join("");
  return `<section class="view-heading"><div><span class="eyebrow">STERNENKARTOGRAFIE</span><h1>Systemübersicht</h1><p>Je heller ein Stern leuchtet, desto mehr freie oder bewohnte Welten enthält sein System.</p></div><span class="sector-label">SENSORIK ${state.research.deepSpaceSensors} · ${galaxyRadius.toFixed(1)} SEKTOREN</span></section>
  <div class="galaxy-toolbar"><div><button class="secondary-button" data-map-action="left" aria-label="Karte nach links">←</button><button class="secondary-button" data-map-action="up" aria-label="Karte nach oben">↑</button><button class="secondary-button" data-map-action="down" aria-label="Karte nach unten">↓</button><button class="secondary-button" data-map-action="right" aria-label="Karte nach rechts">→</button></div><div><button class="secondary-button" data-map-action="out" aria-label="Verkleinern">−</button><span>${galaxyZoom.toFixed(1)}×</span><button class="secondary-button" data-map-action="in" aria-label="Vergrößern">+</button><button class="secondary-button" data-map-action="home">Heimat zentrieren</button><button class="secondary-button" data-map-action="refresh">Sensoren aktualisieren</button></div></div>
  ${galaxyError ? `<div class="tip">${escapeHtml(galaxyError)}</div>` : ""}
  <div class="galaxy-layout"><section class="universe-map" aria-label="Galaxiekarte">${space}${markers}<div class="home-signal" style="left:${origin.x}%;top:${origin.y}%"><i></i><span>${escapeHtml(activePlanet().name)}</span></div><div class="map-caption">X ${center.x.toFixed(0)} · Y ${center.y.toFixed(0)} · ${galaxyIntel.length} SYSTEME · KARTENRAUM ${galaxySpan} × ${galaxySpan}<small>Ziehen zum Verschieben · Mausrad zum Zoomen · Stern anklicken, dann eine Position 1–13 wählen.</small></div></section>${galaxyInspector()}</div>
  <section class="contact-console"><div class="panel-title"><h2>Erfasste Sternsysteme</h2><span>${galaxyIntel.length} SYSTEME</span></div><table><thead><tr><th>System</th><th>X : Y</th><th>Entfernung</th><th>Welten</th></tr></thead><tbody>${galaxyIntel.map(system => `<tr class="${system.id === selectedSignalId ? "selected" : ""}"><td><button data-signal-id="${escapeHtml(system.id)}">${escapeHtml(system.signature)}</button></td><td>${galaxyCoordinates(system.position)}</td><td>${system.distance} Sektoren</td><td>${system.planetCount} sichtbar · ${system.occupiedCount} bewohnt</td></tr>`).join("") || `<tr><td colspan="4">Keine Systeme im Sichtkreis. Tiefraumsensorik erweitert die Reichweite.</td></tr>`}</tbody></table></section>
  <section class="panel galaxy-flight-panel"><div class="panel-inner"><div class="panel-title"><h2>Flottenbewegungen</h2><span>${state.missions.length} AKTIV</span></div>${missionStatusMarkup()}</div></section>
  <section class="mission-list" style="margin-top:16px"><div class="panel-title"><h2>Expeditionen & Kolonisierung</h2><span>NEUTRALE ZIELE</span></div>${Object.values(MISSIONS).map(missionCard).join("")}</section>`;
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
  const reward = Object.entries(mission.reward).map(([key, value]) => `${resourceIconMarkup(key, "resource-icon--inline")} ${formatNumber(value)}`).join(" · ");
  const outcome = colonization ? "UNBEKANNT: 96 bis 390 Baufelder" : `BEUTE: ${reward}`;
  return `<article class="mission-card ${colonization ? "colonization" : ""}"><div><span class="badge">${mission.kind}</span><h2 style="margin-top:8px">${mission.name}</h2><p>${mission.description}</p><span class="risk">${colonization ? "Planetengröße vor Landung verborgen" : `Abwehrstärke ${mission.defense}`} · ${shipNote}</span><br><span class="reward">${outcome}</span></div><button class="primary-button" data-mission="${mission.id}" ${!viable || busy ? "disabled" : ""}>${busy ? "Max. Einsätze aktiv" : viable ? (colonization ? "Kolonie gründen" : "Flotte entsenden") : "Flotte erforderlich"}</button></article>`;
}
function mailboxMessageMarkup(message) {
  const inbound = message.direction === "inbound";
  return `<article class="mail-card ${inbound && !message.read ? "unread" : ""}"><div class="mail-card-head"><span class="badge">${inbound ? "EINGANG" : "GESENDET"}</span><time>${formatDateTime(message.at)}</time></div><h3>${escapeHtml(message.subject)}</h3><p><b>${inbound ? "Von" : "An"}:</b> ${escapeHtml(inbound ? message.sender : message.recipient)}</p><p>${escapeHtml(message.body)}</p>${inbound ? `<button class="secondary-button" data-reply-to="${escapeHtml(message.sender)}" data-reply-subject="${escapeHtml(message.subject)}">Antworten</button>` : ""}</article>`;
}
function spyArchiveMarkup(report) {
  const stillValid = report.expiresAt > Date.now();
  return `<article class="mail-card intel-archive"><div class="mail-card-head"><span class="badge">SPIONAGE · ${report.intelligence}/5</span><time>${formatDateTime(report.createdAt)}</time></div><h3>${escapeHtml(report.signature)}</h3><p>${escapeHtml(report.owner || "Besitzer unbekannt")} · ${report.world ? `${report.world.fields} Baufelder` : "Weltparameter verschlüsselt"}</p><p>${report.resources ? Object.entries(report.resources).map(([key, value]) => `${resourceIconMarkup(key, "resource-icon--inline")} ${formatNumber(value)}`).join(" · ") : "Rohstoffscan fehlgeschlagen"}</p><small class="${stillValid ? "positive" : ""}">${stillValid ? `Noch ${formatDuration(report.expiresAt - Date.now())} für Angriffe gültig` : "Archivbericht · Angriff nicht mehr freigeschaltet"}</small></article>`;
}
function combatArchiveMarkup(report) {
  const loot = Object.entries(report.loot || {}).filter(([, value]) => value).map(([key, value]) => `${resourceIconMarkup(key, "resource-icon--inline")} ${formatNumber(value)}`).join(" · ") || "keine Beute";
  return `<article class="mail-card combat-archive"><div class="mail-card-head"><span class="badge">KAMPF · ${report.won ? "SIEG" : "VERLUST"}</span><time>${formatDateTime(report.at)}</time></div><h3>${escapeHtml(report.side === "attacker" ? "Raubzug gegen" : "Angriff von")} ${escapeHtml(report.opponent)}</h3><p>Angriff ${formatNumber(report.attackPower)} · Abwehr ${formatNumber(report.defensePower)}</p><p>Beute: ${loot}</p><small>Eigene Verluste: ${escapeHtml(report.attackerLosses || "keine")}</small></article>`;
}
function messagesView() {
  const messages = [...(state.messages || [])].sort((a, b) => b.at - a.at);
  const spyReports = [...(state.spyReports || [])].sort((a, b) => b.createdAt - a.createdAt);
  const combatReports = [...(state.combatReports || [])].sort((a, b) => b.at - a.at);
  const unread = messages.filter((message) => message.direction === "inbound" && !message.read).length;
  return `<section class="view-heading"><div><span class="eyebrow">KOMMANDOKANAL</span><h1>Nachrichten & Berichte</h1><p>Direktnachrichten, Aufklärung und Kampfergebnisse bleiben hier als Archiv erhalten.</p></div><span class="sector-label">${unread} UNGELESEN · ${messages.length} NACHRICHTEN</span></section><div class="grid two-column"><section class="panel"><div class="panel-inner"><div class="panel-title"><h2>Neue Nachricht</h2><span>DIREKTKANAL</span></div><form id="message-compose" class="message-compose"><label>Empfänger<input name="recipient" required maxlength="20" value="${escapeHtml(messageRecipient)}" placeholder="Kommandantenname"></label><label>Betreff<input name="subject" required maxlength="72" value="${escapeHtml(messageSubject)}" placeholder="z. B. Handelsangebot"></label><label>Nachricht<textarea name="body" required maxlength="1200" rows="5" placeholder="Deine Nachricht an einen anderen Kommandanten"></textarea></label><button class="primary-button" type="submit">Nachricht senden</button></form></div></section><section class="panel"><div class="panel-inner"><div class="panel-title"><h2>Systemalarme</h2><span>${state.notifications?.length || 0} MELDUNGEN</span></div>${notificationMarkup()}</div></section></div><section class="archive-section"><div class="panel-title"><h2>Postfach</h2><span>${messages.length} EINTRÄGE</span></div><div class="mail-grid">${messages.map(mailboxMessageMarkup).join("") || `<div class="empty-state"><strong>Postfach leer</strong>Suche einen Spieler und eröffne einen direkten Kanal.</div>`}</div></section><section class="archive-section"><div class="panel-title"><h2>Spionageberichte</h2><span>${spyReports.length} ARCHIVIERT</span></div><div class="mail-grid">${spyReports.map(spyArchiveMarkup).join("") || `<div class="empty-state"><strong>Keine Aufklärung verfügbar</strong>Wähle in der Galaxie einen gegnerischen Planeten und entsende Sonden.</div>`}</div></section><section class="archive-section"><div class="panel-title"><h2>Kampfberichte</h2><span>${combatReports.length} ARCHIVIERT</span></div><div class="mail-grid">${combatReports.map(combatArchiveMarkup).join("") || `<div class="empty-state"><strong>Keine Kampfberichte</strong>Angriffe und Abwehraktionen werden nach dem Gefecht hier gespeichert.</div>`}</div></section>`;
}
function playersView() {
  return `<section class="view-heading"><div><span class="eyebrow">KOMMANDANTENNETZ</span><h1>Spielersuche</h1><p>Finde einen Kommandanten und eröffne einen privaten Direktkanal. Der Empfänger erhält eine Meldung im eigenen Postfach.</p></div><span class="sector-label">${playerSearchResults.length} TREFFER</span></section><section class="panel"><div class="panel-inner"><form id="player-search-form" class="player-search" novalidate><input name="query" maxlength="20" placeholder="Kommandantenname suchen"><button class="primary-button" type="button" data-player-search>Spieler suchen</button></form></div></section><section class="archive-section"><div class="panel-title"><h2>Gefundene Kommandanten</h2><span>ONLINE-DATENBANK</span></div><div class="mail-grid">${playerSearchResults.map((player) => `<article class="mail-card"><span class="badge">KOMMANDANT</span><h3>${escapeHtml(player.username)}</h3><p>${formatNumber(player.score)} Punkte · ${player.planets} Planet${player.planets === 1 ? "" : "en"}</p><button class="primary-button" data-message-player="${escapeHtml(player.username)}">Nachricht schreiben</button></article>`).join("") || `<div class="empty-state"><strong>Suche starten</strong>Gib mindestens drei Zeichen des Kommandantennamens ein.</div>`}</div></section>`;
}
function logView() {
  return `<section class="view-heading"><div><span class="eyebrow">EREIGNISSPEICHER</span><h1>Flugdaten und Industrieprotokoll.</h1><p>Die jüngsten achtzig Ereignisse bleiben im serverseitigen Spielstand erhalten.</p></div><span class="sector-label">${state.log.length} EINTRÄGE</span></section><section class="log-list">${state.log.map((entry) => `<article class="log-row ${escapeHtml(entry.type)}"><time>${new Date(entry.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span>${escapeHtml(entry.text)}</span></article>`).join("")}</section>`;
}
async function searchPlayers(query) {
  try {
    const response = await fetch(`/api/players?q=${encodeURIComponent(query)}`, { credentials: "same-origin" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Spielersuche nicht verfügbar.");
    playerSearchResults = payload.players || [];
    render();
  } catch (error) { toast(error.message || "Spielersuche nicht verfügbar.", true); }
}
async function sendPlayerMessage(form) {
  if (actionBusy) return;
  const formData = new FormData(form);
  const recipient = String(formData.get("recipient") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!recipient || !subject || !body) return;
  actionBusy = true;
  try {
    if (!await save({ quiet: true })) return;
    const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ recipient, subject, body }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Nachricht konnte nicht gesendet werden.");
    state = payload.state;
    ensureStateShape();
    messageRecipient = "";
    messageSubject = "";
    toast(`Nachricht an ${recipient} gesendet.`);
    render();
  } catch (error) { toast(error.message || "Nachricht konnte nicht gesendet werden.", true);
  } finally { actionBusy = false; }
}
function render() {
  if (!state) return;
  resourceTicker();
  $("#commander-name").textContent = state.commander;
  const planetSwitch = $("#planet-switch");
  if (document.activeElement !== planetSwitch) planetSwitch.innerHTML = state.planets.map(planet => `<option value="${escapeHtml(planet.id)}" ${planet.id === activePlanet().id ? "selected" : ""}>${escapeHtml(planet.name)}</option>`).join("");
  $(".planet-card strong").textContent = activePlanet().name;
  $$("#nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
  const views = { overview: overviewView, buildings: buildingsView, research: researchView, shipyard: shipyardView, defense: defenseView, galaxy: galaxyView, messages: messagesView, players: playersView, log: logView, economy: economyView, fleets: fleetsView, ranking: rankingView, statistics: statisticsView, techtree: techtreeView, help: helpView };
  content.innerHTML = views[activeView]();
}

function startBuilding(key, amount = 1) {
  synchronize();
  const config = BUILDINGS[key];
  let added = 0;
  for (let index = 0; index < amount; index += 1) {
    const projected = projectedBuildingState();
    const targetLevel = projected.buildings[key] + 1;
    if (targetLevel > LEVEL_CAP) break;
    const requirements = config.requires ? config.requires(projected) : [];
    const cost = getCost(config, targetLevel);
    if (requirements.some((item) => !item.ok) || !hasResources(cost) || !hasFreeFields(config, key)) break;
    pay(cost);
    state.queues.building.push({ key, targetLevel, cost, fieldCost: targetLevel === 1 ? config.fieldCost : 0, queuedAt: Date.now() });
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
function cancelBuilding(index) {
  synchronize();
  const queue = buildingQueue();
  const item = queue[index];
  if (!item) return;
  const config = BUILDINGS[item.key];
  for (const resource of Object.keys(RESOURCE_LABELS)) state.resources[resource] = Math.max(0, state.resources[resource] + Number(item.cost?.[resource] || 0));
  queue.splice(index, 1);
  if (index === 0) activateNextBuilding(Date.now());
  addLog("system", `${config.name} auf Stufe ${item.targetLevel} abgebrochen. Volle Kosten erstattet.`);
  toast(`${config.name} abgebrochen · volle Kosten zurückerstattet.`);
  render();
  save({ quiet: true });
}
function startResearch(key) {
  synchronize();
  const config = RESEARCH[key];
  const level = state.research[key];
  if (level >= LEVEL_CAP) return;
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
  state.queues.ship = { key, amount: 1, planetId: activePlanet().id, startedAt, completesAt: startedAt + shipTime(ship.cost) };
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
  if (["overview", "ranking"].includes(activeView)) fetchLeaderboard();
  if (activeView === "galaxy") fetchGalaxy({ force: true });
});
content.addEventListener("input", event => {
  if (event.target.dataset.fleetKey) raidSelection[event.target.dataset.fleetKey] = Math.max(0,Math.min(Number(event.target.max),Math.floor(Number(event.target.value)||0)));
});
content.addEventListener("submit", event => {
  if (event.target.id === "message-compose") { event.preventDefault(); sendPlayerMessage(event.target); }
  if (event.target.id === "player-search-form") { event.preventDefault(); const query = String(new FormData(event.target).get("query") || "").trim(); if (query.length < 3) { toast("Bitte mindestens drei Zeichen eingeben.", true); return; } searchPlayers(query); }
});
content.addEventListener("pointerdown", event => {
  const map = event.target.closest(".universe-map");
  if (!map || event.button !== 0) return;
  mapGesture = { x:event.clientX,y:event.clientY,offset:{...galaxyOffset},size:map.getBoundingClientRect().width,moved:false };
});
content.addEventListener("pointermove", event => {
  if (!mapGesture) return;
  const dx=event.clientX-mapGesture.x, dy=event.clientY-mapGesture.y;
  if (Math.hypot(dx,dy)<5 && !mapGesture.moved) return;
  mapGesture.moved = true;
  content.setPointerCapture(event.pointerId);
  galaxyOffset = {x:Math.max(-galaxySpan,Math.min(galaxySpan,mapGesture.offset.x-dx/mapGesture.size*galaxySpan/galaxyZoom)),y:Math.max(-galaxySpan,Math.min(galaxySpan,mapGesture.offset.y-dy/mapGesture.size*galaxySpan/galaxyZoom))};
  render();
});
const finishMapGesture = event => {
  if (!mapGesture) return;
  if (mapGesture.moved) suppressMapClickUntil=Date.now()+300;
  mapGesture=null;
  if (content.hasPointerCapture(event.pointerId)) content.releasePointerCapture(event.pointerId);
};
content.addEventListener("pointerup",finishMapGesture);
content.addEventListener("pointercancel",finishMapGesture);
content.addEventListener("pointerleave",event=>{ if(mapGesture && !mapGesture.moved) mapGesture=null; });
content.addEventListener("wheel", event => {
  const map=event.target.closest(".universe-map");
  if (!map) return;
  event.preventDefault();
  const rect=map.getBoundingClientRect(), oldSize=galaxySpan/galaxyZoom;
  galaxyZoom=Math.max(.5,Math.min(5,galaxyZoom*(event.deltaY>0?.85:1.18)));
  const diff=oldSize-galaxySpan/galaxyZoom;
  galaxyOffset.x+=((event.clientX-rect.left)/rect.width-.5)*diff;
  galaxyOffset.y+=((event.clientY-rect.top)/rect.height-.5)*diff;
  render();
},{passive:false});
content.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.dataset.playerSearch !== undefined) {
    const query = String(new FormData(button.closest("form")).get("query") || "").trim();
    if (query.length < 3) { toast("Bitte mindestens drei Zeichen eingeben.", true); return; }
    searchPlayers(query);
    return;
  }
  if (button.dataset.messagePlayer) {
    messageRecipient = button.dataset.messagePlayer;
    messageSubject = "";
    activeView = "messages";
    render();
    return;
  }
  if (button.dataset.replyTo) {
    messageRecipient = button.dataset.replyTo;
    messageSubject = `Re: ${button.dataset.replySubject || "Nachricht"}`.slice(0, 72);
    render();
    return;
  }
  if (button.dataset.cancelBuilding !== undefined) {
    cancelBuilding(Number(button.dataset.cancelBuilding));
    return;
  }
  if (button.dataset.signalId) {
    if (Date.now() < suppressMapClickUntil) return;
    selectedSignalId = button.dataset.signalId;
    selectedOrbitTargetId = null;
    raidSelection = {};
    render(); return;
  }
  if (button.dataset.orbitTarget) {
    selectedOrbitTargetId = button.dataset.orbitTarget;
    raidSelection = {};
    render(); return;
  }
  if (button.dataset.colonize) { colonizeTarget(button.dataset.colonize); return; }
  if (actionBusy || isSaving) { toast("Speicherung läuft – bitte gleich erneut versuchen."); return; }
  if (button.dataset.spyTarget) { spyTarget(button.dataset.spyTarget, Number(button.dataset.probes)); return; }
  if (button.dataset.mapAction) {
    const action = button.dataset.mapAction;
    const step = galaxySpan * .15 / galaxyZoom;
    if (action === "left") galaxyOffset.x -= step;
    if (action === "right") galaxyOffset.x += step;
    if (action === "up") galaxyOffset.y -= step;
    if (action === "down") galaxyOffset.y += step;
    if (action === "in") galaxyZoom = Math.min(5, galaxyZoom + .5);
    if (action === "out") galaxyZoom = Math.max(.5, galaxyZoom - .5);
    if (action === "home") galaxyOffset = { x: 0, y: 0 };
    if (action === "refresh") fetchGalaxy({ force: true });
    render();
    return;
  }
  if (button.dataset.planetId) {
    const planet = state.planets.find((entry) => entry.id === button.dataset.planetId);
    if (!planet) return;
    state.activePlanetId = planet.id;
    addLog("system", `Aktive Welt auf ${planet.name} gewechselt.`);
    toast(`${planet.name} ist jetzt die aktive Welt.`);
    render();
    save({ quiet: true });
    return;
  }
  if (button.dataset.raidTarget) {
    raidTarget(button.dataset.raidTarget);
    return;
  }
  if (button.dataset.build) startBuilding(button.dataset.build);
  if (button.dataset.buildBatch) startBuilding(button.dataset.buildBatch, Number(button.dataset.amount) || 3);
  if (button.dataset.research) startResearch(button.dataset.research);
  if (button.dataset.ship) startShip(button.dataset.ship);
  if (button.dataset.mission) startMission(button.dataset.mission);
});
$$('[data-auth-mode]').forEach((button) => button.addEventListener("click", () => setGateMode(button.dataset.authMode)));
$("#start-button").addEventListener("click", () => enterGame($("#commander-input").value, $("#password-input").value));
$("#password-input").addEventListener("keydown", (event) => { if (event.key === "Enter") enterGame($("#commander-input").value, event.currentTarget.value); });
$("#save-button").addEventListener("click", () => { if (!actionBusy) save(); });
$("#planet-switch").addEventListener("change", async (event) => {
  if (isSaving || actionBusy) { event.target.value = activePlanet().id; return; }
  state.activePlanetId = event.target.value;
  galaxyOffset = { x: 0, y: 0 };
  selectedSignalId = null;
  selectedOrbitTargetId = null;
  await save({ quiet: true });
  await fetchGalaxy({ force: true });
  render();
});
$("#logout-button").addEventListener("click", () => { if (!actionBusy && !isSaving) logout(); });

setGateMode("register");
restoreSession();
setInterval(() => {
  if (!state || actionBusy || isSaving) return;
  synchronize();
  const activeElement = document.activeElement;
  const editingText = activeElement?.matches("input, textarea, [contenteditable='true']");
  const selectingText = Boolean(window.getSelection?.().toString());
  if (activeView === "galaxy") {
    resourceTicker();
    const cooldown = Math.max(0, Math.ceil((15000 - (Date.now() - (state.lastSpyAt || 0))) / 1000));
    $$("[data-spy-target]", content).forEach((button) => {
      button.disabled = cooldown > 0 || state.ships.spyProbe < Number(button.dataset.probes);
      if (button.dataset.probes === "1") button.textContent = cooldown ? `Sondenkanal · ${cooldown}s` : "Mit 1 Sonde ausspähen";
    });
  } else if (!editingText && !selectingText) render();
  if (Date.now() % 5_000 < 1300) save({ quiet: true });
  if (activeView === "overview") fetchLeaderboard();
  if (activeView === "galaxy") fetchGalaxy();
}, 1000);
window.addEventListener("beforeunload", () => { if (state) save({ quiet: true }); });
