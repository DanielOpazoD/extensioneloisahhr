import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { validateReleaseCandidate } from "./release-policy.mjs";
const {
  GITHUB_REPOSITORY: repo,
  GITHUB_ACTOR: actor,
  GITHUB_REPOSITORY_OWNER: owner,
  GITHUB_REF: ref,
  GITHUB_SHA: sha,
} = process.env;
if (
  repo !== "DanielOpazoD/extensioneloisahhr" ||
  actor !== owner ||
  ref !== "refs/heads/main"
)
  throw new Error("Solo el propietario puede publicar desde main.");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const api = (resource) =>
  JSON.parse(execFileSync("gh", ["api", resource], { encoding: "utf8" }));
if (
  git("rev-parse", "HEAD") !== sha ||
  api(`repos/${repo}/git/ref/heads/main`).object.sha !== sha
)
  throw new Error(
    "main avanzó. Vuelve a ejecutar la publicación sobre su versión actual.",
  );
const checks = api(`repos/${repo}/commits/${sha}/check-runs`).check_runs;
const latestCheck = checks
  .filter((check) => check.name === "extension-ci")
  .sort((a, b) => b.id - a.id)[0];
if (latestCheck?.conclusion !== "success")
  throw new Error("Falta CI aprobada para este commit exacto.");
const version = JSON.parse(fs.readFileSync("extension/manifest.json")).version;
const tuple = (value) => value.replace(/^v/, "").split(".").map(Number);
const compare = (a, b) => {
  const x = tuple(a),
    y = tuple(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};
const releases = api(`repos/${repo}/releases?per_page=100`).filter(
  (release) => !release.draft && /^v\d+\.\d+\.\d+$/.test(release.tag_name),
);
releases.sort((a, b) => compare(b.tag_name, a.tag_name));
const latest = releases[0];
let baseBuildId = "",
  baseTag = "";
let previous = null,
  containsPrevious = true;
if (latest) {
  if (compare(version, latest.tag_name) <= 0)
    throw new Error("La versión debe superar la última publicación.");
  try {
    git("merge-base", "--is-ancestor", `refs/tags/${latest.tag_name}`, sha);
  } catch {
    containsPrevious = false;
  }
  const asset = latest.assets.find((item) => item.name === "release.json");
  if (!asset)
    throw new Error("La última publicación no tiene metadata verificable.");
  const metadata = JSON.parse(
    execFileSync(
      "gh",
      [
        "api",
        "-H",
        "Accept: application/octet-stream",
        `repos/${repo}/releases/assets/${asset.id}`,
      ],
      { encoding: "utf8" },
    ),
  );
  if (!/^[a-f0-9]{64}$/.test(metadata.buildId))
    throw new Error("Identidad de la publicación anterior inválida.");
  previous = { version: latest.tag_name.slice(1), buildId: metadata.buildId };
}
({ baseBuildId, baseTag } = validateReleaseCandidate({
  repository: repo,
  actor,
  owner,
  ref,
  sourceCommit: sha,
  mainCommit: api(`repos/${repo}/git/ref/heads/main`).object.sha,
  ciSucceeded: latestCheck?.conclusion === "success",
  version,
  previous,
  containsPrevious,
}));
fs.appendFileSync(
  process.env.GITHUB_ENV,
  `BASE_BUILD_ID=${baseBuildId}\nBASE_RELEASE_TAG=${baseTag}\n`,
);
console.log(
  JSON.stringify({ version, baseTag: baseTag || null, sourceCommit: sha }),
);
