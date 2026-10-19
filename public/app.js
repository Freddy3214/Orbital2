Warning: truncated output (original token count: 43688)
Total output lines: 2053

import { FLEET, DEFENSE, SPEED_START_AT, WORLD_SPEED, worldSpeedAt } from "./units.js?v=20261006-speed-1";
import { simulateBattle } from "./combat.js?v=20261006-loot-1";
import { initLanguage, translateText, translateDOM, setProtectedTexts, locale } from "./i18n.js";
const IS_DEMO = location.pathname === "/demo";
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
    icon: "☼", image: "/assets/solar-array.svg", fieldCost: 1, name: "Solarkraftwerk", group: "Infrastruktur", factor: 1.5, base: { metal: 75, crystal: 30 },
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
    detail: (level) => `Bautempo: +${level * 8}%`,
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
  computerTech: {
    icon: "⌘", image: "/assets/research-lab.svg", name: "Computertechnik", factor: 1.8, base: { metal: 200, crystal: 450, tritium: 100 },
    description: "Vernetzte Rechenkerne beschleunigen neue Forschungsaufträge auf allen Welten um 8 % pro Stufe.",
    detail: (level) => `Forschungstempo: +${level * 8}%`,
    requires: (s) => [requirement(s.buildings.researchLab >= 2, "Forschungslabor Stufe 2"), requirement(s.research.energyTech >= 2, "Energietechnik Stufe 2")],
  },
  storageTech: {
    icon: "▣", image: "/assets/resource-vault.svg", name: "Lagertechnik", factor: 1.75, base: { metal: 400, crystal: 250, tritium: 50 },
    description: "Verdichtete Lagerzellen erhöhen die Kapazität aller Rohstoffspeicher um 10 % pro Stufe.",
    detail: (level) => `Lagerkapazität: +${level * 10}%`,
    requires: (s) => [requirement(s.buildings.researchLab >= 1, "Forschungslabor Stufe 1"), requirement(s.research.energyTech >= 1, "Energietechnik Stufe 1")],
  },
  deepSpaceSensors: {
    icon: "◎", image: "/assets/sensor-array.svg", name: "Tiefraumsensorik", factor: 1.65, base: { metal: 160, crystal: 240, tritium: 60 },
    description: "Erweitert den sichtbaren Raum und verbessert die Detailtiefe der Spionageberichte.",
    detail: (level) => `Sichtkreis: ${Math.min(340, 14 + Math.min(100, level) * 3.26).toFixed(1)} Sektoren`,
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
    stats: "Stärke 4 · Fracht 850", requires: (s) => [
      requirement(s.buildings.shipyard >= 2, "Orbitalwerft Stufe 2"),
      requirement(s.research.combustionDrive >= 1, "Verbrennungsantrieb Stufe 1"),
    ],
  },
  interceptor: {
    icon: "⋈", image: "/assets/interceptor.svg", name: "Interzeptor", cost: { metal: 270, crystal: 160, tritium: 80 },
    description: "Leichter Abfangjäger für riskante Expeditionen und Piratenabwehr.",
    stats: "Stärke 45 · Beutefracht 120", requires: (s) => [
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
const SHIPYARD_ORDER = ["spyProbe", "colonyShip", "cargoDrone", "smallTransport", "mediumTransport", "largeTransport", "interceptor", "frigate", "cruiser", "battleship", "destroyer"];

for (const [key,item] of Object.entries(FLEET)) if (item.name) SHIPS[key] = {
  ...item, icon:key.includes("Transport") ? "▱" : "➤", image:key.includes("Transport") ? "/assets/cargo-drone.svg" : "/assets/interceptor.svg",
  description:key.includes("Transport") ? "Transportiert Vorräte zwischen eigenen Welten und unterstützt Raubzüge." : "Schweres Kampfschiff für Angriffe und die Heimatverteidigung.",
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
  computerTech:[2,1], storageTech:[0,1],
  deepSpaceSensors:[1,2], energyTech:[2,0], combustionDrive:[3,1],
  avionics:[2,1], plasmaTheory:[2,1], constructionEngineering:[1,1],
});
assignAtlas(SHIPS, FLEET_ATLAS, 2.001, 2, {
  spyProbe:[0,0], interceptor:[0,1], colonyShip:[3,1],
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
let lastAutoSave = Date.now();
let lastFullRender = 0;
let lastLeaderboardFetch = 0;
let isSaving = false;
let authMode = "register";
let galaxyIntel = [];
let galaxySensorOrigins = [];
let fleetStatusFilter = "all";
let galaxyOrigin = { x: 50, y: 50 };
let galaxyRadius = 14;
let galaxySpan = 220;
let galaxyZoom = 1;
let raidSelection = {};
let simulationDraft = null;
let simulationSource = null;
let transferSelection = {};
let selectedMailboxEntry = null;
let mailboxFilter = "all";
let mailboxSearch = "";
let mailboxSearchDraft = "";
let mailboxSelection = new Set();
let transferStep = 1;
let transferDraft = { destination:"", metal:0, crystal:0, tritium:0 };
const QUEUE_LIMIT = 5;
function boostedDuration(duration, at = Date.now()) {
  const before = Math.min(duration, Math.max(0, (state.buildBoostFrom || at) - at));
  const window = Math.max(0, (state.buildBoostUntil || 0) - (at + before));
  const accelerated = Math.min(duration - before, window * 20);
  return before + accelerated / 20 + (duration - before - accelerated);
}
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
let messageBody = "";
let canGrantTestResources = false;

const PLANET_TYPES = {
  temperate: { name: "Gemäßigte Welt", terrain: "Grünland, Meere und Gebirgsketten (+5 % alle Erträge)", position: "0% 0%", accent: "cyan", bonus: { metal: 1.05, crystal: 1.05, tritium: 1.05, solar: 1.05 } },
  arid: { name: "Aride Welt", terrain: "Staubmeere, Canyons und Erzadern (+15 % Kristall & Solar)", position: "50% 0%", accent: "amber", bonus: { metal: 1.0, crystal: 1.15, tritium: 0.9, solar: 1.15 } },
  ocean: { name: "Ozeanwelt", terrain: "Inselketten und tiefe Wasserbecken (+15 % Tritium, +5 % Kristall)", position: "100% 0%", accent: "blue", bonus: { metal: 0.95, crystal: 1.05, tritium: 1.15, solar: 1.0 } },
  ice: { name: "Eiswelt", terrain: "Gletscherplatten und kryogene Risse (+25 % Tritium, −15 % Solar)", position: "0% 100%", accent: "ice", bonus: { metal: 1.0, crystal: 1.0, tritium: 1.25, solar: 0.85 } },
  volcanic: { name: "Vulkanische Welt", terrain: "Lavaströme und Basaltfelder (+20 % Metall, +25 % Solar)", position: "50% 100%", accent: "red", bonus: { metal: 1.2, crystal: 0.95, tritium: 0.8, solar: 1.25 } },
  gas: { name: "Gasriese", terrain: "Sturmwirbel und Ammoniakbänder (+30 % Tritium)", position: "100% 100%", accent: "violet", bonus: { metal: 0.85, crystal: 0.95, tritium: 1.3, solar: 0.9 } },
};

function requirement(ok, text) { return { ok, text }; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function formatNumber(value) { return new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(Number(value) || 0))); }
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
  return new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}
function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat(locale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
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
function activePlanet() {
  return state.planets.find((planet) => planet.id === state.activePlanetId) || state.planets[0];
}
function planetResources(planet = activePlanet()) { return planet?.resources || state.resources; }
function bindPlanetResources() { state.resources = planetResources(); }
function planetBuildings(planet = activePlanet()) { return planet?.buildings || state.buildings || {}; }
function planetState(planet = activePlanet()) { return { ...state, buildings: planetBuildings(planet) }; }
function calculatedPlanetFields(planet = activePlanet()) {
  return Object.values(planetBuildings(planet)).reduce((sum, level) => sum + Math.max(0, Math.floor(Number(level) || 0)), 0);
}
function fieldUsage(planet = activePlanet()) {
  return calculatedPlanetFields(planet);
}
function availableFields(planet = activePlanet()) {
  return Math.max(0, planet.fields - fieldUsage(planet));
}
function hasFreeFields(config, key = "") {
  const reserved = buildingQueue().length;
  return availableFields() - reserved >= 1;
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
    usedFields: 1,
    coordinates: `G 02 · Sektor ${20 + count} · Orbit ${1 + Math.floor(Math.random() * 13)}`,
    colonizedAt: Date.now(),
    homeworld: false,
    buildings: Object.fromEntries(Object.keys(BUILDINGS).map((key) => [key, key === "commandCenter" ? 1 : 0])),
    buildingQueue: [],
    shipQueue: null,
    defenses: {},
    productionLoad: { metal: 100, crystal: 100, tritium: 100 },
    resources: { metal: 0, crystal: 0, tritium: 0, lastUpdate: Date.now() },
  };
}
function ensureStateShape() {
  for (const key of Object.keys(SHIPS)) if (!SHIPS[key].isDefense) state.ships[key] ??= 0;
  for (const key of Object.keys(RESEARCH)) state.research[key] ??= 0;
  state.ships.spyProbe ??= 0;
  state.spyReports ??= [];
  state.combatReports ??= [];
  state.pvpFlights = Array.isArray(state.pvpFlights) ? state.pvpFlights : [];
  state.incomingFlights = Array.isArray(state.incomingFlights) ? state.incomingFlights : [];
  state.messages ??= [];
  state.notifications ??= [];
  state.career ??= { path: null, warXp: 0, tradeXp: 0 };
  state.readReports ??= [];
  state.archivedReports = Array.isArray(state.archivedReports) ? state.archivedReports : [];
  for (const key of Object.keys(state.research || {})) state.research[key] = Math.max(0, Math.min(LEVEL_CAP, Math.floor(Number(state.research[key]) || 0)));
  state.ships.colonyShip ??= 0;
  const legacyBuildings = { ...(state.buildings || {}) };
  const emptyBuildings = () => Object.fromEntries(Object.keys(BUILDINGS).map((key) => [key, key === "commandCenter" ? 1 : 0]));
  if (!Array.isArray(state.planets) || !state.planets.length) {
    state.planets = [{ id: "vesta-prime", name: "Vesta Prime", type: "temperate", classification: "Gemäßigte Welt", fields: 228, usedFields: 3, coordinates: "G 02 · Sektor 17 · Orbit 04", colonizedAt: state.createdAt || Date.now(), homeworld: true }];
  }
  state.queues ??= {};
  const legacyBuildingQueue = Array.isArray(state.queues.building) ? state.queues.building : state.queues.building ? [state.queues.building] : [];
  const legacyShipQueue = state.queues.ship || null;
  state.queues.research ??= null;
  state.queues.researchWaiting ??= [];
  state.planets = state.planets.map((planet, index) => ({
    id: planet.id || `planet-${index}`,
    name: planet.name || `Kolonie ${index}`,
    type: PLANET_TYPES[planet.type] ? planet.type : "temperate",
    classification: planet.classification || PLANET_TYPES[planet.type]?.name || "Gemäßigte Welt",
    fields: Math.max(96, Math.min(390, Number(planet.fields) || 228)),
    usedFields: Math.max(0, Number(planet.usedFields) || 0),
    coordinates: planet.coordinates || "Unbekannte Koordinaten",
    colonizedAt: planet.colonizedAt || Date.now(),
    homeworld: Boolean(planet.homeworld || index === 0),
    position: planet.position,
    buildings: { ...(planet.buildings || (planet.homeworld || index === 0 ? legacyBuildings : emptyBuildings())) },
    buildingQueue: Array.isArray(planet.buildingQueue) ? planet.buildingQueue : (planet.homeworld || index === 0 ? legacyBuildingQueue : []),
    shipQueue: planet.shipQueue || (legacyShipQueue?.planetId === planet.id || (!legacyShipQueue?.planetId && (planet.homeworld || index === 0)) ? legacyShipQueue : null),
    shipWaiting: Array.isArray(planet.shipWaiting) ? planet.shipWaiting : [],
    defenses: planet.defenses || {},
    productionLoad: Object.fromEntries(Object.keys(RESOURCE_LABELS).map(key => [key, productionLoad(planet, key)])),
    resources: { metal: 0, crystal: 0, tritium: 0, lastUpdate: Date.now(), ...(planet.resources || (planet.homeworld || index === 0 ? state.resources : {})) },
  }));
  for (const planet of state.planets) {
    // Existing overlong queues are reduced without losing paid resources.
    const removed = planet.buildingQueue.splice(5);
    for (const item of removed) for (const key of Object.keys(RESOURCE_LABELS)) planet.resources[key] += Number(item.cost?.[key] || 0);
    if (removed.length) addLog("system", `${planet.name}: ${removed.length} überzählige Bauaufträge erstattet (neues Limit: 5).`);
    const defaults = emptyBuildings();
    for (const key of Object.keys(defaults)) planet.buildings[key] = Math.max(0, Math.min(LEVEL_CAP, Math.floor(Number(planet.buildings[key] ?? defaults[key]) || 0)));
    planet.usedFields = calculatedPlanetFields(planet);
  }
  state.activePlanetId = state.planets.some((planet) => planet.id === state.activePlanetId) ? state.activePlanetId : state.planets[0].id;
  bindPlanetResources();
  const homeworld = state.planets.find((planet) => planet.homeworld);
  state.buildings = { ...(homeworld?.buildings || legacyBuildings) };
  state.queues.building = [];
  state.queues.ship = null;
}
function buildingQueue(planet = activePlanet()) { return Array.isArray(planet?.buildingQueue) ? planet.buildingQueue : []; }
function shipQueue(planet = activePlanet()) { return planet?.shipQueue || null; }
function researchOrders() { return [state.queues.research, ...(state.queues.researchWaiting || [])].filter(Boolean); }
function shipOrders(planet = activePlanet()) { return [shipQueue(planet), ...(planet.shipWaiting || [])].filter(Boolean); }
function projectedResearchLevel(key) { return (state.research[key] || 0) + researchOrders().filter(item => item.key === key).length; }
function activateNextOrders(at) {
  if (!state.queues.research && state.queues.researchWaiting.length) {
    const item = state.queues.researchWaiting.shift();
    const planet = state.planets.find(p => p.id === item.planetId) || activePlanet();
    item.startedAt = at;
    item.completesAt = at + researchTime(item.cost, planet, at);
    state.queues.research = item;
  }
  for (const planet of state.planets) if (!planet.shipQueue && planet.shipWaiting?.length) {
    const item = planet.shipWaiting.shift();
    item.startedAt = at;
    item.completesAt = at + shipTime(SHIPS[item.key], planet, at);
    planet.shipQueue = item;
  }
}
function constructionSpeedFactor(planet = activePlanet()) {
  return 1 + Math.min(100, planetBuildings(planet).roboticsFactory || 0) * .08 + Math.min(100, state.research.constructionEngineering || 0) * .12;
}
function buildingQueueSchedule(now = Date.now()) {
  let cursor = now;
  return buildingQueue().map((queue, index) => {
    const start = index === 0 && queue.startedAt ? queue.startedAt : cursor;
    const duration = buildTime(queue.cost || getCost(BUILDINGS[queue.key], queue.targetLevel), queue.targetLevel, activePlanet(), start);
    const end = index === 0 && queue.completesAt ? queue.completesAt : Math.max(cursor, start) + duration;
    cursor = Math.max(now, end);
    return { queue, index, start, end, duration };
  });
}
function projectedBuildingLevel(key) { return (planetBuildings()[key] || 0) + buildingQueue().filter((item) => item.key === key).length; }
function projectedBuildingState() {
  const projected = { ...state, buildings: { ...planetBuildings() } };
  for (const item of buildingQueue()) projected.buildings[item.key] = item.targetLevel;
  return projected;
}
function planetArtMarkup(planet, className = "") {
  const type = PLANET_TYPES[planet.type] || PLANET_TYPES.temperate;
  return `<span class="planet-art ${className}" style="--planet-position:${type.position}" role="img" aria-label="${escapeHtml(type.name)}: ${escapeHtml(type.terrain)}"></span>`;
}

async function openSpyTarget(targetId) {
  activeView = "galaxy";
  await fetchGalaxy({ force: true });
  const system = galaxyIntel.find(entry => entry.slots?.some(slot => slot.targetId === targetId));
  if (!system) {
    render();
    toast("Ziel derzeit außerhalb deiner Sensorreichweite. Erforsche Tiefraumsensorik oder wähle eine näher gelegene Kolonie.", true);
    return;
  }
  selectedSignalId = system.id;
  selectedOrbitTargetId = targetId;
  galaxyOffset = { x: system.position.x - galaxyOrigin.x, y: system.position.y - galaxyOrigin.y };
  raidSelection = {};
  render();
  content.querySelector(".fleet-selector")?.scrollIntoView({ block: "center", behavior: "smooth" });
}
function entityArtMarkup(config) {
  if (config.atlas) return `<span class="entity-art atlas-art" style="--art-image:url('${config.atlas}');--art-ratio:${config.atlasRatio};--art-x:${config.artX};--art-y:${config.artY}" role="img" aria-label="Illustration ${escapeHtml(config.name)}"></span>`;
  return `<img class="entity-art" src="${config.image}" alt="Illustration ${escapeHtml(config.name)}" loading="lazy" decoding="async">`;
}

function metalOutput(level) { return Math.floor(30 * level * 1.1 ** level) + 30; }
function crystalOutput(level) { return Math.floor(20 * level * 1.1 ** level) + 15; }
function tritiumOutput(level) { return Math.floor(10 * level * 1.1 ** level); }
function energySupply(level) { return Math.floor(20 * level * 1.1 ** level); }
function storageCap(resource, level = planetBuildings()[`${resource}Storage`]) {
  const careerBoost = state.career?.path === "trader" ? 1.25 : 1;
  return Math.floor(25000 * 1.65 ** level * (1 + (state.research.storageTech || 0) * .1) * careerBoost);
}
function productionLoad(planet = activePlanet(), resource) {
  const value = Number(planet?.productionLoad?.[resource]);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value / 10) * 10)) : 100;
}
function energyStats(planet = activePlanet()) {
  const b = planetBuildings(planet);
  const biomeSolar = (PLANET_TYPES[planet?.type] || PLANET_TYPES.temperate).bonus?.solar || 1;
  const supply = Math.floor(energySupply(b.solarPlant) * (1 + state.research.energyTech * .05) * biomeSolar);
  const demand = Math.floor(10 * b.metalMine * 1.1 ** b.metalMine * productionLoad(planet, "metal") / 100)
    + Math.floor(10 * b.crystalMine * 1.1 ** b.crystalMine * productionLoad(planet, "crystal") / 100)
    + Math.floor(20 * b.tritiumSynthesizer * 1.1 ** b.tritiumSynthesizer * productionLoad(planet, "tritium") / 100);
  const efficiency = demand === 0 ? 1 : Math.min(1, supply / demand);
  return { supply, demand, efficiency, net: supply - demand };
}
function production(planet = activePlanet(), at = Date.now()) {
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
}
function playerScore() {
  const levels = [...state.planets.flatMap((planet) => Object.values(planetBuildings(planet))), ...Object.values(state.research)];
  return Math.floor(levels.reduce((sum, level) => sum + level ** 2 * 12, 0) + Object.values(state.ships).reduce((sum, count) => sum + count * 4, 0));
}
function buildTime(cost, targetLevel = 1, planet = activePlanet(), at = Date.now()) {
  const level = Math.max(1, Number(targetLevel) || 1);
  const resourceSeconds = (cost.metal + cost.crystal + cost.tritium) / 40;
  const progressionSeconds = 45 * 1.45 ** (level - 1);
  const rawSeconds = Math.min(90 * 24 * 60 * 60, Math.max(resourceSeconds, progressionSeconds));
  const robotics = Math.min(100, planetBuildings(planet).roboticsFactory || 0);
  const logistics = Math.min(100, state.research.constructionEngineering || 0);
  const speed = 1 + robotics * .08 + logistics * .12;
  return Math.max(1000, boostedDuration(Math.max(15000, (rawSeconds / speed) * 1000) / worldSpeedAt(at), at));
}
function researchTime(cost, planet = activePlanet(), at = Date.now()) { return Math.max(1000, boostedDuration(Math.max(5000, ((cost.metal + cost.crystal + cost.tritium) / (80 * (1 + planetBuildings(planet).researchLab) * (1 + (state.research.computerTech || 0) * .08))) * 1000) / worldSpeedAt(at), at)); }
function shipTime(ship, planet = activePlanet(), at = Date.now()) {
  const cost = ship.cost;
  const baseTime = ((cost.metal + cost.crystal + cost.tritium) / (105 * (1 + planetBuildings(planet).shipyard))) * 1000;
  return Math.max(1000, boostedDuration(Math.max(Number(ship.minimumBuildTimeMs) || 5000, baseTime) / worldSpeedAt(at), at));
}

function addProduction(hours, planet = activePlanet(), at = Date.now()) {
  if (hours <= 0) return;
  const rate = production(planet, at), resources = planetResources(planet);
  for (const resource of Object.keys(RESOURCE_LABELS)) {
    const current = resources[resource];
    resources[resource] = Math.max(current, Math.min(storageCap(resource, planetBuildings(planet)[`${resource}Storage`]), current + rate[resource] * hours));
  }
}
function grantResources(reward) {
  for (const resource of Object.keys(RESOURCE_LABELS)) {
    const current = state.resources[resource];
    state.resources[resource] = Math.max(current, Math.min(storageCap(resource), current + (reward[resource] || 0)));
  }
}
function nextEventAfter(cursor, now) {
  const times = [now];
  const planetaryQueues = state.planets.flatMap((planet) => [buildingQueue(planet)[0], shipQueue(planet)]);
  for (const queue of [...planetaryQueues, state.queues.research]) {
    if (queue?.completesAt > cursor && queue.completesAt <= now) times.push(queue.completesAt);
  }
  for (const mission of state.missions) {
    if (mission.phase === "outgoing" && mission.arrivesAt > cursor && mission.arrivesAt <= now) times.push(mission.arrivesAt);
    if (mission.phase === "returning" && mission.returnAt > cursor && mission.returnAt <= now) times.push(mission.returnAt);
  }
  return Math.min(...times);
}
function activateNextBuilding(at = Date.now(), planet = activePlanet()) {
  const next = buildingQueue(planet)[0];
  if (!next || next.startedAt) return;
  next.startedAt = at;
  next.completesAt = at + buildTime(next.cost || getCost(BUILDINGS[next.key], next.targetLevel), next.targetLevel, planet, at);
}
function resolveQueues(at) {
  for (const planet of state.planets) {
    const activeBuilding = buildingQueue(planet)[0];
    if (activeBuilding?.completesAt <= at) {
      planetBuildings(pla…23688 tokens truncated…y=>mailboxSelection.has(entry.key));
    mailboxSelection = new Set(allSelected ? [] : visible.map(entry=>entry.key));
    render(); return;
  }
  if (isSaving || actionBusy) return toast("Speicherung läuft – bitte gleich erneut versuchen.");
  const selected = visible.filter(entry=>mailboxSelection.has(entry.key));
  if (!selected.length) return toast("Bitte zuerst Nachrichten auswählen.");
  const archived = new Set(state.archivedReports);
  const read = new Set(state.readReports);
  for (const entry of selected) {
    if (action === "read") { entry.item.read = true; read.add(entry.key); }
    if (action === "archive") archived.add(entry.key);
    if (action === "restore") archived.delete(entry.key);
  }
  const existing = new Set(mailboxEntries().map(entry=>entry.key));
  state.archivedReports = [...archived].filter(key=>existing.has(key));
  state.readReports = [...read].slice(-240);
  mailboxSelection.clear();
  if (action !== "read") selectedMailboxEntry = null;
  render(); save({quiet:true});
}
function messagesView() {
  const all = mailboxEntries();
  const entries = filteredMailboxEntries();
  const selected = entries.find(entry => entry.key === selectedMailboxEntry);
  const labels = {all:"Alle", unread:"Ungelesen", mail:"Posteingang", sent:"Gesendet", spy:"Spionage", combat:"Kampf", admin:"Admin", archive:"Archiv"};
  let detail = '<div class="empty-state"><strong>Nachricht auswählen</strong>Klicke links auf eine Mail, um den vollständigen Bericht zu lesen.</div>';
  if (selected) {
    const item = selected.item;
    detail = ["mail","sent","admin"].includes(selected.kind) ? mailboxMessageMarkup(item) : selected.kind === "spy" ? spyArchiveMarkup(item) + (item.side === "defender" ? "" : reportSection("Flotte",item.ships,SHIPS) + reportSection("Infrastruktur",item.buildings,BUILDINGS) + reportSection("Forschung",item.research,RESEARCH) + reportSection("Planetare Abwehr",item.defenses,DEFENSE)) : combatArchiveMarkup(item);
  }
  return `<section class="view-heading"><div><span class="eyebrow">KOMMANDOKANAL</span><h1>Postfach</h1><p>Nur Direktnachrichten, Spionage- und Kampfberichte sowie Nachrichten vom Admin.</p></div><span class="sector-label">${all.filter(e=>e.unread).length} UNGELESEN</span></section>
  <div class="mailbox-filters">${Object.entries(labels).map(([key,label])=>`<button class="secondary-button ${mailboxFilter===key?"active":""}" data-mail-filter="${key}">${label}</button>`).join("")}</div>
  <form id="mailbox-search-form" class="mailbox-search"><input id="mailbox-search" type="search" aria-label="Nachrichten durchsuchen" placeholder="Betreff, Absender oder Text …" value="${escapeHtml(mailboxSearchDraft)}"><button class="primary-button" type="submit">Suchen</button><button class="secondary-button" type="button" data-mail-clear>Zurücksetzen</button></form>
  <div class="mailbox-tools"><button class="secondary-button" data-mail-bulk="select">Alle / keine auswählen</button><button class="secondary-button" data-mail-bulk="read">Als gelesen markieren</button><button class="secondary-button" data-mail-bulk="${mailboxFilter === "archive" ? "restore" : "archive"}">${mailboxFilter === "archive" ? "Zurück ins Postfach" : "Archivieren"}</button><span><b id="mailbox-selected">${mailboxSelection.size}</b> ausgewählt · ${entries.length} Treffer</span></div>
  <section class="mailbox-shell"><aside class="mailbox-list">${entries.map(entry=>`<div class="mail-list-item"><input type="checkbox" aria-label="${escapeHtml(entry.title)} auswählen" data-mail-select="${escapeHtml(entry.key)}" ${mailboxSelection.has(entry.key)?"checked":""}><button class="mail-row ${entry.unread?"unread":""} ${entry.key===selectedMailboxEntry?"selected":""}" data-mail-entry="${escapeHtml(entry.key)}"><span class="badge">${labels[entry.kind]}</span><time>${formatDateTime(entry.at)}</time><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.from || "System")} · ${escapeHtml(String(entry.preview || "").slice(0,110))}</small></button></div>`).join("") || '<div class="empty-state">Keine Nachrichten in diesem Ordner.</div>'}</aside><section class="panel mailbox-reading"><div class="panel-inner">${detail}</div></section></section>
  <details class="panel compose-panel" ${messageRecipient?"open":""}><summary>✉ Neue Nachricht schreiben</summary><div class="panel-inner"><form id="message-compose" class="message-compose"><label>Empfänger<input name="recipient" required maxlength="20" value="${escapeHtml(messageRecipient)}" placeholder="Kommandantenname"></label><label>Betreff<input name="subject" required maxlength="72" value="${escapeHtml(messageSubject)}" placeholder="Betreff"></label><label>Nachricht<textarea name="body" required maxlength="1200" rows="5"></textarea></label><button class="primary-button" type="submit">Nachricht senden</button></form></div></details>`;
}
function playersView() {
  return `<section class="view-heading"><div><span class="eyebrow">KOMMANDANTENNETZ</span><h1>Spielersuche</h1><p>Finde einen Kommandanten und eröffne einen privaten Direktkanal. Der Empfänger erhält eine Meldung im eigenen Postfach.</p></div><span class="sector-label">${playerSearchResults.length} TREFFER</span></section><section class="panel"><div class="panel-inner"><form id="player-search-form" class="player-search" novalidate><input name="query" maxlength="20" placeholder="Kommandantenname suchen"><button class="primary-button" type="button" data-player-search>Spieler suchen</button></form></div></section><section class="archive-section"><div class="panel-title"><h2>Gefundene Kommandanten</h2><span>ONLINE-DATENBANK</span></div><div class="mail-grid">${playerSearchResults.map((player) => `<article class="mail-card"><span class="badge">${player.self ? "DEIN ACCOUNT" : "KOMMANDANT"}</span><h3>${escapeHtml(player.username)}</h3><p>${formatNumber(player.score)} Punkte · ${player.planets} Planet${player.planets === 1 ? "" : "en"}</p><div class="player-actions"><button class="primary-button" data-message-player="${escapeHtml(player.username)}">Nachricht schreiben</button>${canGrantTestResources ? `<button class="secondary-button" data-test-grant="${escapeHtml(player.username)}">50.000 je Ressource senden</button><button class="secondary-button" data-test-boost="${escapeHtml(player.username)}">1 Std. Bauboost · −95 %</button>` : ""}</div></article>`).join("") || `<div class="empty-state"><strong>Suche starten</strong>Gib mindestens drei Zeichen des Kommandantennamens ein.</div>`}</div></section>`;
}
async function grantBuildBoost(username) {
  if (!canGrantTestResources || actionBusy) return;
  actionBusy = true;
  try {
    const response = await fetch("/api/test/grant-boost", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Boost fehlgeschlagen.");
    if(result.state){state=result.state;ensureStateShape();render();}
    toast("Bauboost für " + result.username + " aktiviert: 60 Minuten, 20-faches Bautempo.");
  } catch(error) { toast(error.message,true); }
  finally { actionBusy = false; }
}
async function grantTestResources(username) {
  if (!canGrantTestResources || actionBusy) return;
  actionBusy = true;
  try {
    const response = await fetch("/api/test/grant-resources", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ username }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Testlieferung fehlgeschlagen.");
    if(payload.state){state=payload.state;ensureStateShape();}
    toast(`50.000 Metall, Kristall und Tritium an ${payload.username} gesendet.`);
  } catch (error) { toast(error.message || "Testlieferung fehlgeschlagen.", true);
  } finally { actionBusy = false; render(); }
}
async function renamePlanet(planetId) {
  const planet = state.planets.find((entry) => entry.id === planetId);
  if (!planet || actionBusy || isSaving) return;
  const name = window.prompt("Neuer Planetenname (3–28 Zeichen)", planet.name)?.trim();
  if (!name || name === planet.name) return;
  actionBusy = true;
  try {
    if (!await save({ quiet: true })) return;
    const response = await fetch("/api/planets/rename", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ planetId, name }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Umbenennen fehlgeschlagen.");
    state = payload.state;
    ensureStateShape();
    toast(`Planet heißt jetzt ${state.planets.find((entry) => entry.id === planetId)?.name || name}.`);
  } catch (error) { toast(error.message || "Umbenennen fehlgeschlagen.", true);
  } finally { actionBusy = false; render(); }
}
function logView() {
  return `<section class="view-heading"><div><span class="eyebrow">EREIGNISSPEICHER</span><h1>Flugdaten und Industrieprotokoll.</h1><p>Die jüngsten achtzig Ereignisse bleiben im serverseitigen Spielstand erhalten.</p></div><span class="sector-label">${state.log.length} EINTRÄGE</span></section><section class="log-list">${state.log.map((entry) => `<article class="log-row ${escapeHtml(entry.type)}"><time>${new Date(entry.at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span>${escapeHtml(entry.text)}</span></article>`).join("")}</section>`;
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
    messageBody = "";
    toast(`Nachricht an ${recipient} gesendet.`);
    render();
  } catch (error) { toast(error.message || "Nachricht konnte nicht gesendet werden.", true);
  } finally { actionBusy = false; }
}
function render() {
  if (!state) return;
  setProtectedTexts([state.commander,...state.planets.map(p=>p.name),...galaxyIntel.flatMap(system=>system.slots.flatMap(slot=>[slot.name,slot.owner])),...playerSearchResults.map(player=>player.username)]);
  lastFullRender = Date.now();
  resourceTicker();
  $("#commander-name").textContent = state.commander;
  const planetSwitch = $("#planet-switch");
  if (document.activeElement !== planetSwitch) planetSwitch.innerHTML = state.planets.map(planet => `<option value="${escapeHtml(planet.id)}" ${planet.id === activePlanet().id ? "selected" : ""}>${escapeHtml(planet.name)}</option>`).join("");
  $(".planet-card strong").textContent = activePlanet().name;
  $(".planet-card .eyebrow").textContent = activePlanet().homeworld ? "HEIMATWELT" : "KOLONIE";
  $(".planet-card span:not(.eyebrow)").textContent = activePlanet().coordinates;
  $$("#nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
  const views = { overview: overviewView, buildings: buildingsView, research: researchView, career: careerView, shipyard: shipyardView, defense: defenseView, galaxy: galaxyView, messages: messagesView, players: playersView, log: logView, economy: economyView, fleets: fleetsView, simulator: simulatorView, ranking: rankingView, statistics: statisticsView, techtree: techtreeView, help: helpView };
  content.innerHTML = (state.buildBoostUntil > Date.now() ? `<div class="boost-banner">⚡ Bauboost aktiv · ${formatDuration(state.buildBoostUntil - Date.now())} · 20× Tempo für Gebäude, Forschung und Schiffe</div>` : "") + views[activeView]();
  const messageField = content.querySelector('#message-compose textarea[name="body"]');
  if (messageField) messageField.value = messageBody;
  const unreadCount = mailboxEntries().filter(entry => entry.unread).length;
  const messageNav = document.querySelector('#nav [data-view="messages"]');
  if (messageNav) messageNav.innerHTML = `<span>✉</span> Nachrichten${unreadCount ? ` (${unreadCount})` : ""}`;
  if (IS_DEMO) {
    content.insertAdjacentHTML("afterbegin",'<div class="demo-banner"><strong>DEMO · Beispielimperium</strong><span>Nur ansehen · Kein echter Spielstand · Keine Speicherung</span><a href="/">Eigenes Imperium starten →</a></div>');
    content.querySelectorAll("[data-build],[data-build-batch],[data-research],[data-ship],[data-mission],[data-colonize],[data-spy-target],[data-raid-target],[data-start-transfer]").forEach(button=>button.disabled=true);
  }
  translateDOM();
}

function startBuilding(key, amount = 1) {
  synchronize();
  const config = BUILDINGS[key];
  let added = 0;
  for (let index = 0; index < amount && buildingQueue().length < QUEUE_LIMIT; index += 1) {
    const projected = projectedBuildingState();
    const targetLevel = projected.buildings[key] + 1;
    if (targetLevel > LEVEL_CAP) break;
    const requirements = config.requires ? config.requires(projected) : [];
    const cost = getCost(config, targetLevel);
    if (requirements.some((item) => !item.ok) || !hasResources(cost) || !hasFreeFields(config, key)) break;
    pay(cost);
    buildingQueue().push({ key, targetLevel, cost, fieldCost: 1, queuedAt: Date.now() });
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
  let nextLevel = planetBuildings()[item.key] || 0;
  for (const pending of queue.filter(order => order.key === item.key)) {
    pending.targetLevel = ++nextLevel;
    const correctedCost = getCost(config,pending.targetLevel);
    for (const resource of Object.keys(RESOURCE_LABELS)) state.resources[resource] += Math.max(0,(pending.cost?.[resource] || 0) - (correctedCost[resource] || 0));
    pending.cost = correctedCost;
  }
  if (index === 0) activateNextBuilding(Date.now());
  addLog("system", `${config.name} auf Stufe ${item.targetLevel} abgebrochen. Volle Kosten erstattet.`);
  toast(`${config.name} abgebrochen · volle Kosten zurückerstattet.`);
  render();
  save({ quiet: true });
}
function startResearch(key) {
  synchronize();
  const config = RESEARCH[key];
  const level = projectedResearchLevel(key);
  if (level >= LEVEL_CAP) return;
  const requirements = config.requires(planetState());
  const cost = getCost(config, level + 1);
  if (researchOrders().length >= QUEUE_LIMIT || requirements.some((item) => !item.ok) || !hasResources(cost)) return;
  pay(cost);
  const startedAt = Date.now();
  state.queues.researchWaiting.push({ key, targetLevel: level + 1, cost, planetId: activePlanet().id });
  activateNextOrders(startedAt);
  addLog("system", `${config.name} auf Stufe ${level + 1} angestoßen.`);
  toast(`${config.name} wird erforscht.`);
  render();
  save({ quiet: true });
}
function startShip(key) {
  synchronize();
  const ship = SHIPS[key];
  if (shipOrders().length >= QUEUE_LIMIT || ship.requires(planetState()).some((item) => !item.ok) || !hasResources(ship.cost)) return;
  pay(ship.cost);
  const startedAt = Date.now();
  activePlanet().shipWaiting ??= [];
  activePlanet().shipWaiting.push({ key, amount: 1, cost: ship.cost, planetId: activePlanet().id });
  activateNextOrders(startedAt);
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
  const speed = worldSpeedAt();
  const duration = Math.max(speed === 1 ? 0 : 30_000, Math.round((target.minutes * 60_000) / (drive * speed)));
  const departedAt = Date.now();
  state.missions.push({ id: `${targetId}-${departedAt}`, targetId, departedAt, arrivesAt: departedAt + duration, duration, phase: "outgoing", fleet: { cargoDrone: selectedShip === "cargoDrone" ? 1 : 0, interceptor: selectedShip === "interceptor" ? 1 : 0, colonyShip: selectedShip === "colonyShip" ? 1 : 0 } });
  addLog("mission", `${SHIPS[selectedShip].name} nach ${target.name} entsandt.`);
  toast(`Flotte auf Kurs: ${target.name}.`);
  render();
  save({ quiet: true });
}
function startTransfer() {
  if (actionBusy || isSaving) return toast("Speicherung läuft – bitte gleich erneut versuchen.");
  synchronize();
  const destinationId = transferDraft.destination;
  const destination = state.planets.find(planet => planet.id === destinationId);
  const fleet = Object.fromEntries(Object.entries(transferSelection).filter(([key, count]) => ["cargoDrone","smallTransport","mediumTransport","largeTransport"].includes(key) && Number.isSafeInteger(count) && count > 0));
  const capacity = Object.entries(fleet).reduce((sum, [key, count]) => sum + (FLEET[key]?.cargo || 0) * count, 0);
  const cargo = Object.fromEntries(Object.keys(RESOURCE_LABELS).map(key => [key, Math.max(0, Math.floor(Number(transferDraft[key]) || 0))]));
  const total = Object.values(cargo).reduce((sum, value) => sum + value, 0);
  if (!destination || destination.id === activePlanet().id || !Number.isSafeInteger(total) || !capacity || !total) return toast("Wähle Transporter, Zielwelt und Fracht.", true);
  if (total > capacity) return toast(`Fracht überschreitet die Kapazität von ${formatNumber(capacity)}.`, true);
  if (Object.keys(cargo).some(key => cargo[key] > (state.resources[key] || 0))) return toast("Nicht genügend Rohstoffe auf der Startwelt.", true);
  for (const [key, count] of Object.entries(fleet)) if (count > (state.ships[key] || 0)) return toast("Ein gewählter Transporter ist nicht verfügbar.", true);
  for (const key of Object.keys(cargo)) state.resources[key] -= cargo[key];
  for (const [key, count] of Object.entries(fleet)) state.ships[key] -= count;
  const sourcePos = activePlanet().position, targetPos = destination.position;
  const distance = sourcePos && targetPos ? Math.hypot(sourcePos.x-targetPos.x,sourcePos.y-targetPos.y) : 5;
  const duration = transferDuration(distance);
  const departedAt = Date.now();
  state.missions.push({ id:`transport-${departedAt}`, kind:"transport", sourcePlanetId:activePlanet().id, destinationPlanetId:destination.id, departedAt, arrivesAt:departedAt + duration, duration, phase:"outgoing", fleet, cargo });
  addLog("mission", `Konvoi nach ${destination.name} gestartet.`);
  toast(`Konvoi nach ${destination.name} unterwegs.`);
  transferSelection = {};
  transferStep = 1;
  transferDraft = {destination:"",metal:0,crystal:0,tritium:0};
  render(); save({ quiet:true });
}
function pay(cost) { for (const resource of Object.keys(RESOURCE_LABELS)) state.resources[resource] = Math.max(0, state.resources[resource] - (cost[resource] || 0)); }
function toast(message, error = false) {
  const element = document.createElement("div");
  element.className = `toast${error ? " error" : ""}`;
  element.textContent = translateText(message);
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
  if (event.target.closest("#message-compose")) {
    if (event.target.name === "recipient") messageRecipient = event.target.value;
    if (event.target.name === "subject") messageSubject = event.target.value;
    if (event.target.name === "body") messageBody = event.target.value;
  }
  if (event.target.dataset.fleetKey) raidSelection[event.target.dataset.fleetKey] = Math.max(0,Math.min(Number(event.target.max),Math.floor(Number(event.target.value)||0)));
  if (event.target.dataset.transferFleet) {
    transferSelection[event.target.dataset.transferFleet] = Math.max(0, Math.min(Number(event.target.max), Math.floor(Number(event.target.value) || 0)));
    const capacity = Object.entries(transferSelection).reduce((sum,[key,count])=>sum+(FLEET[key]?.cargo || 0)*count,0);
    $("#transfer-capacity").textContent = formatNumber(capacity);
    const start = $("[data-start-transfer]");
    if (start) start.disabled = !capacity;
  }
  if (event.target.dataset.transferResource) {
    transferDraft[event.target.dataset.transferResource] = Math.max(0,Math.floor(Number(event.target.value)||0));
    const loaded = $("#transfer-loaded");
    if (loaded) loaded.textContent = formatNumber(transferPlan().total);
  }
  if (event.target.id === "mailbox-search") mailboxSearchDraft = event.target.value;
  if (event.target.id === "report-rescan-probes") {
    const probes = Number(event.target.value);
    const cooldown = Date.now() - (state.lastSpyAt || 0) < 15000;
    const button = $("[data-rescan-target]", content);
    if (button) button.disabled = !Number.isInteger(probes) || probes < 1 || probes > 12 || probes > (state.ships.spyProbe || 0) || cooldown || actionBusy;
  }
  if (event.target.dataset.mailSelect) {
    if (event.target.checked) mailboxSelection.add(event.target.dataset.mailSelect);
    else mailboxSelection.delete(event.target.dataset.mailSelect);
    const count = $("#mailbox-selected");
    if (count) count.textContent = mailboxSelection.size;
  }
  if (event.target.id === "transfer-destination") transferDraft.destination = event.target.value;
});
content.addEventListener("change", event => {
  const key = event.target.dataset.productionLoad;
  if (!key || !Object.hasOwn(RESOURCE_LABELS, key)) return;
  if (IS_DEMO || isSaving || actionBusy) { render(); return; }
  synchronize();
  activePlanet().productionLoad[key] = Math.max(0, Math.min(100, Math.floor(Number(event.target.value) / 10) * 10));
  render();
  save({ quiet: true });
});
content.addEventListener("submit", event => {
  if (IS_DEMO) { event.preventDefault(); toast("Die Demo ist schreibgeschützt. Erstelle einen Account, um zu spielen."); return; }
  if (event.target.id === "mailbox-search-form") { event.preventDefault(); mailboxSearch = mailboxSearchDraft.trim(); mailboxSelection.clear(); render(); }
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
  if (IS_DEMO && !["signalId","orbitTarget","mapAction","sensorFocus","planetId","openGalaxy","fleetFilter","simulate","simReset","simReport"].some(key=>button.dataset[key]!==undefined)) {
    toast("Die Demo ist schreibgeschützt. Erstelle einen Account, um zu spielen."); return;
  }
  if (button.dataset.playerSearch !== undefined) {
    const query = String(new FormData(button.closest("form")).get("query") || "").trim();
    if (query.length < 3) { toast("Bitte mindestens drei Zeichen eingeben.", true); return; }
    searchPlayers(query);
    return;
  }
  if (button.dataset.simReset !== undefined) { simulationDraft = null; simulationSource = null; render(); return; }
  if (button.dataset.simReport !== undefined) { simulateSpyReport(button.dataset.simReport); return; }
  if (button.dataset.simulate !== undefined) {
    const draft = { attackerFleet:{}, defenderFleet:{}, defenses:{} };
    content.querySelectorAll("[data-sim-key]").forEach(input => {
      const amount = Math.max(0, Math.min(1000000, Math.floor(Number(input.value) || 0)));
      if (input.dataset.simSide) draft[input.dataset.simSide][input.dataset.simKey] = amount;
      else draft[input.dataset.simKey] = amount;
    });
    simulationDraft = draft; render(); return;
  }
  if (button.dataset.messagePlayer) {
    messageRecipient = button.dataset.messagePlayer;
    messageSubject = "";
    activeView = "messages";
    render();
    return;
  }
  if (button.dataset.mailFilter) { mailboxFilter = button.dataset.mailFilter; mailboxSelection.clear(); render(); return; }
  if (button.dataset.mailBulk) { applyMailboxAction(button.dataset.mailBulk); return; }
  if (button.dataset.mailClear !== undefined) { mailboxSearch = ""; mailboxSearchDraft = ""; mailboxSelection.clear(); render(); return; }
  if (button.dataset.openMessages !== undefined) { activeView = "messages"; mailboxFilter = "unread"; selectedMailboxEntry = null; render(); return; }
  if (button.dataset.viewJump) {
    activeView = button.dataset.viewJump;
    render();
    if (button.dataset.focusEntity) content.querySelector(`.entity-card--${button.dataset.focusEntity}`)?.scrollIntoView({ block: "center", behavior: "instant" });
    if (activeView === "galaxy") fetchGalaxy({force:true});
    return;
  }
  if (button.dataset.openSpyTarget) { openSpyTarget(button.dataset.openSpyTarget); return; }
  if (button.dataset.rescanTarget) {
    const probes = Number($("#report-rescan-probes")?.value);
    if (!Number.isInteger(probes) || probes < 1 || probes > 12) return toast("Wähle 1 bis 12 Aufklärsonden.", true);
    if (probes > (state.ships.spyProbe || 0)) return toast("Nicht genügend Aufklärsonden verfügbar.", true);
    spyTarget(button.dataset.rescanTarget, probes);
    return;
  }
  if (button.dataset.openGalaxy !== undefined) { activeView = "galaxy"; render(); fetchGalaxy({force:true}); return; }
  if (button.dataset.transferAll !== undefined) { transferSelection = Object.fromEntries(["cargoDrone","smallTransport","mediumTransport","largeTransport"].map(key=>[key,state.ships[key] || 0])); render(); return; }
  if (button.dataset.transferBack !== undefined) { transferStep = Math.max(1,transferStep-1); render(); return; }
  if (button.dataset.transferNext !== undefined) { const problem=transferProblem(transferStep); if(problem) return toast(problem,true); transferStep=Math.min(4,transferStep+1); render(); return; }
  if (button.dataset.mailEntry) {
    if (selectedMailboxEntry !== button.dataset.mailEntry) raidSelection = {};
    selectedMailboxEntry = button.dataset.mailEntry;
    const entry = mailboxEntries().find(item => item.key === selectedMailboxEntry);
    if (entry) { entry.item.read = true; state.readReports = [...new Set([...state.readReports, entry.key])].slice(-240); }
    if (mailboxFilter === "unread") mailboxFilter = "all";
    render(); save({ quiet:true }); return;
  }
  if (button.dataset.testBoost) { grantBuildBoost(button.dataset.testBoost); return; }
  if (button.dataset.testGrant) { grantTestResources(button.dataset.testGrant); return; }
  if (button.dataset.startTransfer !== undefined) { startTransfer(); return; }
  if (button.dataset.renamePlanet) { renamePlanet(button.dataset.renamePlanet); return; }
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
  if (button.dataset.selectCareer) {
    state.career ??= { path: null, warXp: 0, tradeXp: 0 };
    state.career.path = button.dataset.selectCareer;
    addLog("system", `Spezialisierung gewählt: ${state.career.path === "trader" ? "Händlergilde" : "Kriegerkaste"}.`);
    toast(`Karrierepfad aktiviert: ${state.career.path === "trader" ? "Händlergilde" : "Kriegerkaste"}.`);
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
  if (button.dataset.fleetFilter) { fleetStatusFilter = button.dataset.fleetFilter; render(); return; }
  if (button.dataset.sensorFocus) {
    if (Date.now() < suppressMapClickUntil) return;
    const origin = galaxySensorOrigins.find(o => o.planetId === button.dataset.sensorFocus);
    if (origin) {
      galaxyOffset = { x: origin.position.x - galaxyOrigin.x, y: origin.position.y - galaxyOrigin.y };
      galaxyZoom = Math.max(.5, Math.min(5, galaxySpan / Math.max(44, origin.radius * 2.6)));
    }
    render(); return;
  }
  if (button.dataset.systemStep) {
    const index = galaxyIntel.findIndex(entry => entry.id === selectedSignalId);
    if (index < 0 || !galaxyIntel.length) return;
    const next = galaxyIntel[(index + Number(button.dataset.systemStep) + galaxyIntel.length) % galaxyIntel.length];
    selectedSignalId = next.id;
    selectedOrbitTargetId = null;
    raidSelection = {};
    galaxyOffset = { x: next.position.x - galaxyOrigin.x, y: next.position.y - galaxyOrigin.y };
    render(); return;
  }
  if (button.dataset.signalId) {
    if (Date.now() < suppressMapClickUntil) return;
    selectedSignalId = button.dataset.signalId;
    const system = galaxyIntel.find(entry => entry.id === selectedSignalId);
    if (system) {
      const half = galaxySpan / galaxyZoom * .4;
      if (Math.abs(system.position.x - galaxyOrigin.x - galaxyOffset.x) > half || Math.abs(system.position.y - galaxyOrigin.y - galaxyOffset.y) > half)
        galaxyOffset = { x: system.position.x - galaxyOrigin.x, y: system.position.y - galaxyOrigin.y };
    }
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
    if (action === "empire") fitGalaxyEmpire();
    if (action === "home") galaxyOffset = { x: 0, y: 0 };
    if (action === "refresh") fetchGalaxy({ force: true });
    render();
    return;
  }
  if (button.dataset.planetId) {
    const planet = state.planets.find((entry) => entry.id === button.dataset.planetId);
    if (!planet) return;
    state.activePlanetId = planet.id;
    bindPlanetResources();
    transferSelection = {}; transferStep = 1; transferDraft = {destination:"",metal:0,crystal:0,tritium:0};
    addLog("system", `Aktive Welt auf ${planet.name} gewechselt.`);
    toast(`${planet.name} ist jetzt die aktive Welt.`);
    render();
    save({ quiet: true }).then(() => fetchGalaxy({ force: true }));
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
  bindPlanetResources();
  transferSelection = {}; transferStep = 1; transferDraft = {destination:"",metal:0,crystal:0,tritium:0};
  galaxyOffset = { x: 0, y: 0 };
  selectedSignalId = null;
  selectedOrbitTargetId = null;
  await save({ quiet: true });
  await fetchGalaxy({ force: true });
  render();
});
$("#logout-button").addEventListener("click", () => { if (!actionBusy && !isSaving) logout(); });
$("#theme-switch").addEventListener("change", event => {
  const theme = applyTheme(event.target.value);
  try { localStorage.setItem(themePreferenceKey(), theme); } catch {}
  toast(`Layout: ${{sand:"Sand",nebula:"Blau-Lila",void:"Schwarz"}[theme]}`);
});

setGateMode("register");
document.addEventListener("orbital-language-change", () => { if (state) render(); });
initLanguage();
restoreSession();
setInterval(() => {
  if (!state || actionBusy || isSaving) return;
  synchronize();
  const activeElement = document.activeElement;
  const editingText = activeElement?.matches("input, textarea, select, [contenteditable='true']");
  const selectingText = Boolean(window.getSelection?.().toString());
  if (activeView === "galaxy") {
    resourceTicker();
    const cooldown = Math.max(0, Math.ceil((15000 - (Date.now() - (state.lastSpyAt || 0))) / 1000));
    $$("[data-spy-target]", content).forEach((button) => {
      button.disabled = cooldown > 0 || state.ships.spyProbe < Number(button.dataset.probes);
      if (button.dataset.probes === "1") button.textContent = cooldown ? `Sondenkanal · ${cooldown}s` : "Mit 1 Sonde ausspähen";
    });
  } else {
    resourceTicker();
    if (activeView === "messages") {
      const rescan = $("[data-rescan-target]", content);
      if (rescan) {
        const probes = Number($("#report-rescan-probes", content)?.value);
        const cooldown = Math.max(0, Math.ceil((15000 - (Date.now() - (state.lastSpyAt || 0))) / 1000));
        rescan.disabled = !Number.isInteger(probes) || probes < 1 || probes > 12 || probes > (state.ships.spyProbe || 0) || cooldown > 0 || actionBusy;
        rescan.textContent = cooldown ? `Sondenkanal · ${cooldown}s` : "Erneut erkunden →";
      }
    }
    const liveCountdownView = ["overview", "buildings", "research", "shipyard", "defense", "fleets"].includes(activeView);
    if (!editingText && !selectingText && activeView !== "messages" && (liveCountdownView || Date.now() - lastFullRender >= 5_000)) render();
  }
  if (Date.now() - lastAutoSave >= 15_000) {
    lastAutoSave = Date.now();
    save({ quiet: true });
  }
  if (activeView === "overview") fetchLeaderboard();
  if (activeView === "galaxy") fetchGalaxy();
}, 1000);
document.addEventListener("visibilitychange", () => { if (state && document.visibilityState === "hidden") save({ quiet: true }); });
window.addEventListener("pagehide", () => { if (state) save({ quiet: true }); });

