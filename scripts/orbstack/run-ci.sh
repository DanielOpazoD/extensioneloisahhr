#!/usr/bin/env bash
set -euo pipefail

artifacts="${RUNNER_TEMP:?Directorio de resultados requerido}"
printf 'Linux %s · Node %s · Playwright %s\n' "$(uname -m)" "$(node --version)" "$(npx playwright --version)"

unit() {
  npm run check:version
  npm run check:load-order
  npm run check:shape
  npm test
  npm run check:release
  npm run build
  cp -R dist "$artifacts/extension-candidate"
}

runtime() {
  npm run test:runtime
  npm run test:dau
}

captures() {
  node scripts/capture-medical-round.mjs WORKTREE "$artifacts/ficha-escritorio" lectura
  node scripts/capture-medical-round.mjs WORKTREE "$artifacts/ficha-ingreso" ingreso
  node scripts/capture-history.mjs WORKTREE "$artifacts/ficha-historial"
  node scripts/capture-care-plan.mjs WORKTREE "$artifacts/ficha-plan"
  node scripts/capture-other-views.mjs WORKTREE "$artifacts/ficha-vistas"
  node scripts/capture-summary.mjs WORKTREE "$artifacts/ficha-resumen"
  node scripts/capture-medical-worklist.mjs WORKTREE "$artifacts/lista-medica"
  node scripts/capture-evolution-reader.mjs WORKTREE "$artifacts/lector-evoluciones"
  node scripts/capture-loading.mjs WORKTREE "$artifacts/ficha-carga"
  node scripts/capture-transitions.mjs WORKTREE "$artifacts/ficha-transiciones"
}

unit > "$artifacts/unit.log" 2>&1 & unit_pid=$!
runtime > "$artifacts/runtime.log" 2>&1 & runtime_pid=$!
captures > "$artifacts/captures.log" 2>&1 & captures_pid=$!
printf 'Pruebas unitarias, Chromium y capturas en ejecución.\n'

result=0
report() {
  if wait "$2"; then
    printf '%s aprobado\n' "$1"
  else
    printf '%s falló\n' "$1" >&2
    tail -60 "$artifacts/$1.log" >&2
    result=1
  fi
}
report unit "$unit_pid"
report runtime "$runtime_pid"
report captures "$captures_pid"
exit "$result"
