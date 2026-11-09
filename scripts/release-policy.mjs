export const validateReleaseCandidate = (candidate) => {
  const {
    repository,
    actor,
    owner,
    ref,
    sourceCommit,
    mainCommit,
    ciSucceeded,
    version,
    previous,
    containsPrevious,
  } = candidate;
  if (
    repository !== "DanielOpazoD/extensioneloisahhr" ||
    actor !== owner ||
    ref !== "refs/heads/main"
  ) {
    throw new Error("Solo el propietario puede publicar desde main.");
  }
  if (
    !/^[a-f0-9]{40}$/.test(sourceCommit || "") ||
    sourceCommit !== mainCommit
  ) {
    throw new Error("main avanzó. Publica desde su revisión actual.");
  }
  if (!ciSucceeded) throw new Error("Falta CI aprobada para el commit exacto.");
  if (!/^\d+\.\d+\.\d+$/.test(version || ""))
    throw new Error("Número de versión inválido.");
  if (!previous) return { baseBuildId: "", baseTag: "" };
  const current = version.split(".").map(Number),
    last = previous.version.split(".").map(Number);
  const changed = current.findIndex((value, index) => value !== last[index]);
  if (changed < 0 || current[changed] <= last[changed])
    throw new Error("La versión debe superar la última publicación.");
  if (!containsPrevious)
    throw new Error("La candidata no incorpora la publicación anterior.");
  if (!/^[a-f0-9]{64}$/.test(previous.buildId || ""))
    throw new Error(
      "La publicación anterior no tiene una identidad verificable.",
    );
  return { baseBuildId: previous.buildId, baseTag: `v${previous.version}` };
};
