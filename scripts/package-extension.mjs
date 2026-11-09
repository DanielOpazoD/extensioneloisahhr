import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

export const extensionDirectory = fileURLToPath(
  new URL("../extension/", import.meta.url),
);

/** Package runtime code plus explicitly declared assets, never arbitrary local files. */
export function packageRayenExtension(root) {
  const directory = path.join(root, "extension");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, "manifest.json"), "utf8"),
  );
  // Derived metadata must never survive a source edit or change the input fingerprint.
  delete manifest.version_name;
  const files = new Set([
    "manifest.json",
    "vendor-lock.json",
    ...fs
      .readdirSync(directory)
      .filter((name) => /^(?!\.)[\w.-]+\.(?:js|mjs|html|css)$/.test(name)),
    ...manifest.web_accessible_resources.flatMap((group) => group.resources),
  ]);
  const entries = {};
  const identity = createHash("sha256");
  for (const name of [...files].sort()) {
    if (
      !/^[\w./-]+$/.test(name) ||
      name.split("/").some((part) => part === ".." || part === ".")
    ) {
      throw new Error(`Unsafe extension package path: ${name}`);
    }
    const file = path.join(directory, name);
    if (
      path.isAbsolute(name) ||
      !fs
        .realpathSync(file)
        .startsWith(`${fs.realpathSync(directory)}${path.sep}`)
    ) {
      throw new Error(
        `Extension package file escapes its source directory: ${name}`,
      );
    }
    const bytes =
      name === "manifest.json"
        ? Buffer.from(JSON.stringify(manifest, null, 2) + "\n")
        : fs.readFileSync(file);
    identity.update(JSON.stringify([name, bytes.length]) + "\n").update(bytes);
    entries[name] = [bytes, { mtime: new Date(2020, 0, 1) }];
  }
  const buildId = identity.digest("hex");
  entries["manifest.json"] = [
    Buffer.from(
      JSON.stringify(
        { ...manifest, version_name: `${manifest.version}+hhr1.${buildId}` },
        null,
        2,
      ) + "\n",
    ),
    { mtime: new Date(2020, 0, 1) },
  ];
  const zip = zipSync(entries, { level: 6 });
  const fileName = `downloads/eloisa-extension-${manifest.version}-${buildId.slice(0, 12)}.zip`;
  return { zip, fileName, version: manifest.version, buildId };
}
