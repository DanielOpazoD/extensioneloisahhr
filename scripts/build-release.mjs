import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { packageRayenExtension } from "./package-extension.mjs";

const artifact = packageRayenExtension(process.cwd());
const lock = JSON.parse(fs.readFileSync("package-lock.json"));
if (
  Object.entries(lock.packages).some(
    ([name, pkg]) =>
      name.startsWith("../") ||
      pkg.link ||
      String(pkg.resolved || "").startsWith("file:"),
  )
) {
  throw new Error(
    "El lockfile debe ser portable y no contener dependencias locales enlazadas.",
  );
}
const packageVersion = JSON.parse(fs.readFileSync("package.json")).version;
if (packageVersion !== artifact.version)
  throw new Error("package.json y manifest.json deben tener la misma versión.");
const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
const section = changelog
  .split(/^## /m)
  .find((entry) => entry.split("\n")[0].trim() === artifact.version);
const notes = section?.split("\n").slice(1).join("\n").trim();
if (!notes || /CAMBIOS_PENDIENTES/.test(notes))
  throw new Error(
    `Añade notas de cambios para ${artifact.version} en CHANGELOG.md.`,
  );
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const contract = JSON.parse(fs.readFileSync("contracts/bridge-protocol.json"));
const release = {
  schemaVersion: 1,
  version: artifact.version,
  buildId: artifact.buildId,
  assetName: path.basename(artifact.fileName),
  sha256: createHash("sha256").update(artifact.zip).digest("hex"),
  protocolVersion: contract.protocolVersion,
  sourceRepository: "DanielOpazoD/extensioneloisahhr",
  sourceCommit,
  baseBuildId: process.env.BASE_BUILD_ID || null,
  baseTag: process.env.BASE_RELEASE_TAG || null,
  notes,
};
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync(path.join("dist", release.assetName), artifact.zip);
fs.writeFileSync("dist/release.json", JSON.stringify(release, null, 2) + "\n");
fs.writeFileSync("dist/NOTES.md", notes + "\n");
console.log(
  JSON.stringify({
    version: release.version,
    buildId: release.buildId,
    assetName: release.assetName,
  }),
);
