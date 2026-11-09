// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateReleaseCandidate } from "../../../scripts/release-policy.mjs";
const candidate = {
  repository: "DanielOpazoD/extensioneloisahhr",
  actor: "DanielOpazoD",
  owner: "DanielOpazoD",
  ref: "refs/heads/main",
  sourceCommit: "a".repeat(40),
  mainCommit: "a".repeat(40),
  ciSucceeded: true,
  version: "0.48.89",
  containsPrevious: true,
  previous: { version: "0.48.88", buildId: "b".repeat(64) },
};
describe("extension publication policy", () => {
  it("records the verified previous publication as the base", () => {
    expect(validateReleaseCandidate(candidate)).toEqual({
      baseBuildId: "b".repeat(64),
      baseTag: "v0.48.88",
    });
  });
  it.each([
    { actor: "another-user" },
    { ref: "refs/heads/feature" },
    { ciSucceeded: false },
    { mainCommit: "c".repeat(40) },
    { version: "0.48.88" },
    { version: "0.48.87" },
    { containsPrevious: false },
    { previous: { version: "0.48.88", buildId: "unknown" } },
  ])(
    "rejects publication without a valid owner, exact CI or preserved base: %j",
    (override) => {
      expect(() =>
        validateReleaseCandidate({ ...candidate, ...override }),
      ).toThrow();
    },
  );
  it("permits the first publication only after the same owner and CI checks", () => {
    expect(validateReleaseCandidate({ ...candidate, previous: null })).toEqual({
      baseBuildId: "",
      baseTag: "",
    });
    expect(() =>
      validateReleaseCandidate({
        ...candidate,
        previous: null,
        ciSucceeded: false,
      }),
    ).toThrow();
  });
});
