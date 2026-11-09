// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
const command = path.resolve("scripts/next-version.mjs");
it("prepares one version from the actual base, updates the lock and readers, and does not double-increment", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "extension-next-version-"),
  );
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
  const json = (name: string) =>
    JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
  try {
    git("init");
    git("config", "user.name", "Synthetic");
    git("config", "user.email", "synthetic@example.invalid");
    fs.mkdirSync(path.join(root, "extension"));
    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "synthetic-extension",
        version: "0.48.88",
        private: true,
      }),
    );
    fs.writeFileSync(
      path.join(root, "package-lock.json"),
      JSON.stringify({
        name: "synthetic-extension",
        version: "0.48.88",
        lockfileVersion: 3,
        packages: { "": { name: "synthetic-extension", version: "0.48.88" } },
      }),
    );
    fs.writeFileSync(
      path.join(root, "extension/manifest.json"),
      JSON.stringify({ version: "0.48.88" }),
    );
    for (const name of ["inject-fichamedico.js", "inject-gestioncamas.js"])
      fs.writeFileSync(
        path.join(root, "extension", name),
        "const INJECT_VERSION = '0.48.88';\n",
      );
    fs.writeFileSync(
      path.join(root, "CHANGELOG.md"),
      "# Cambios\n\n## 0.48.88\n\n- Base sintética.\n",
    );
    git("add", ".");
    git("commit", "-m", "base");
    git("update-ref", "refs/remotes/origin/main", git("rev-parse", "HEAD"));
    for (let run = 0; run < 2; run++)
      execFileSync(process.execPath, [command], { cwd: root, stdio: "pipe" });
    expect(json("extension/manifest.json").version).toBe("0.48.89");
    expect(json("package.json").version).toBe("0.48.89");
    expect(json("package-lock.json").version).toBe("0.48.89");
    expect(json("package-lock.json").packages[""].version).toBe("0.48.89");
    for (const name of ["inject-fichamedico.js", "inject-gestioncamas.js"])
      expect(
        fs.readFileSync(path.join(root, "extension", name), "utf8"),
      ).toContain("INJECT_VERSION = '0.48.89'");
    expect(
      fs
        .readFileSync(path.join(root, "CHANGELOG.md"), "utf8")
        .match(/## 0\.48\.89/g),
    ).toHaveLength(1);
    expect(git("tag", "--list")).toBe("");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
