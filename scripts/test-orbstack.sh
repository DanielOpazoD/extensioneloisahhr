#!/usr/bin/env bash
set -euo pipefail

repo="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
revision="$(git -C "$repo" rev-parse HEAD)"
orb_cli="/Applications/OrbStack.app/Contents/MacOS/xbin"
socket="$HOME/.orbstack/run/docker.sock"

if [[ ! -x "$orb_cli/docker" || ! -S "$socket" ]]; then
  echo 'Abre OrbStack y comprueba que su motor Docker esté en ejecución.' >&2
  exit 1
fi

scratch="$(mktemp -d -t eloisa-orbstack)"
trap 'rm -rf -- "$scratch"' EXIT
mkdir "$scratch/docker" "$scratch/deps" "$scratch/checkout"
printf '{"cliPluginsExtraDirs":["%s"]}\n' "$orb_cli" > "$scratch/docker/config.json"
docker=("$orb_cli/docker" --config "$scratch/docker" --host "unix://$socket")

git -C "$scratch/checkout" init --quiet
git -C "$scratch/checkout" fetch --quiet --no-tags "$repo" "$revision" \
  refs/remotes/origin/main:refs/remotes/origin/main
git -C "$scratch/checkout" checkout --quiet --detach "$revision"
cp "$scratch/checkout/package.json" "$scratch/checkout/package-lock.json" "$scratch/deps/"
node_version="$(cat "$scratch/checkout/.nvmrc")"
playwright_version="$(plutil -extract 'packages.node_modules/playwright.version' raw -o - "$scratch/deps/package-lock.json")"

mkdir -p "$repo/dist/orbstack"
artifacts="$(mktemp -d "$repo/dist/orbstack/run.XXXXXX")"
printf 'Commit de prueba %s\nResultados en %s\n' "$revision" "$artifacts"

"${docker[@]}" build --platform linux/amd64 \
  --build-arg "NODE_VERSION=$node_version" --build-arg "PLAYWRIGHT_VERSION=$playwright_version" \
  --file "$scratch/checkout/scripts/orbstack/Dockerfile" \
  --tag eloisa-extension-ci:local --iidfile "$scratch/image" "$scratch/deps"

if [[ "$#" -eq 0 ]]; then
  set -- bash scripts/orbstack/run-ci.sh
fi

"${docker[@]}" run --rm --init --platform linux/amd64 --network none --shm-size=1g \
  --mount "type=bind,src=$scratch/checkout,dst=/workspace" \
  --mount "type=bind,src=$artifacts,dst=/artifacts" \
  --workdir /workspace --env CI=true --env RUNNER_TEMP=/artifacts \
  --env GIT_CONFIG_COUNT=1 --env GIT_CONFIG_KEY_0=safe.directory --env GIT_CONFIG_VALUE_0=/workspace \
  "$(cat "$scratch/image")" bash -c 'ln -s /opt/eloisa-test/node_modules node_modules && exec "$@"' bash "$@"
