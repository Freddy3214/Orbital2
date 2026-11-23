import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = resolve(process.argv[2] || join(root, ".qa", "orbital-preview"));
const assets = {
  "index.html": "preview/index.html",
  "styles.css": "preview/styles.css",
  "app-icon.svg": "public/app-icon.svg",
  "planet-temperate.svg": "public/assets/planet-temperate.svg",
  "trial.css": "public/trial.css",
  "trial.js": "public/trial.js",
};

await mkdir(output, { recursive: true });
await Promise.all(Object.entries(assets).map(([name, source]) => copyFile(join(root, source), join(output, name))));
console.log(`Orbital Foundry preview built with ${Object.keys(assets).length} files.`);
