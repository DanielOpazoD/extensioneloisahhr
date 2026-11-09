import fs from "node:fs";
import { execFileSync } from "node:child_process";
const manifestPath = "extension/manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath));
const base = JSON.parse(
  execFileSync("git", ["show", "origin/main:extension/manifest.json"], {
    encoding: "utf8",
  }),
);
const previous = base.version.split(".").map(Number);
const local = manifest.version.split(".").map(Number);
if (
  previous.length !== 3 ||
  previous.some(
    (value) => !Number.isInteger(value) || value < 0 || value > 65535,
  )
)
  throw new Error("Versión base inválida.");
const next = previous.slice();
next[2] += 1;
for (let index = 2; index > 0; index--)
  if (next[index] > 65535) {
    next[index] = 0;
    next[index - 1] += 1;
  }
if (next[0] > 65535) throw new Error("No se puede incrementar esta versión.");
const first = local.findIndex((value, index) => value !== next[index]);
const target = first >= 0 && local[first] > next[first] ? local : next;
const version = target.join(".");
execFileSync(
  "npm",
  [
    "version",
    version,
    "--allow-same-version",
    "--no-git-tag-version",
    "--ignore-scripts",
  ],
  { stdio: "inherit" },
);
manifest.version = version;
delete manifest.version_name;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
for (const name of ["inject-fichamedico.js", "inject-gestioncamas.js"]) {
  const file = `extension/${name}`;
  const content = fs.readFileSync(file, "utf8");
  if ((content.match(/const INJECT_VERSION = '[^']+'/g) || []).length !== 1)
    throw new Error(`No se puede actualizar ${name}.`);
  fs.writeFileSync(
    file,
    content.replace(
      /const INJECT_VERSION = '[^']+'/,
      `const INJECT_VERSION = '${version}'`,
    ),
  );
}
const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
if (
  !changelog
    .split(/^## /m)
    .some((entry) => entry.split("\n")[0].trim() === version)
) {
  fs.writeFileSync(
    "CHANGELOG.md",
    `# Cambios\n\n## ${version}\n\n- CAMBIOS_PENDIENTES: describe lo que incorpora esta versión.\n\n` +
      changelog.replace(/^# Cambios\s*/, ""),
  );
}
console.log(
  `Versión preparada: ${version}. Completa sus notas y guarda el cambio.`,
);
