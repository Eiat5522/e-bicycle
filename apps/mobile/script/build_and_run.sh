#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-start}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

show_usage() {
  cat <<'USAGE'
usage: ./script/build_and_run.sh [mode]

Modes:
  start, run        Start the Expo dev server
  --ios, ios        Start Expo and open iOS
  --android, android
                   Start Expo and open Android
  --web, web        Start Expo for web
  --dev-client, dev-client
                   Start Expo in development-client mode
  --tunnel, tunnel Start Expo using tunnel transport
  --export-web, export-web
                   Export the web build locally
  --doctor, doctor Run Expo diagnostics
  --help, help     Show this help
USAGE
}

find_up() {
  local name="$1"
  local dir="$ROOT_DIR"

  while [[ "$dir" != "/" ]]; do
    if [[ -e "$dir/$name" ]]; then
      return 0
    fi
    dir="$(dirname "$dir")"
  done

  return 1
}

resolve_expo_cmd() {
  if [[ -n "${EXPO_CLI:-}" ]]; then
    # Optional escape hatch for projects that need a wrapper command.
    # shellcheck disable=SC2206
    EXPO_CMD=(${EXPO_CLI})
    return
  fi

  if find_up "pnpm-lock.yaml" && command -v pnpm >/dev/null 2>&1; then
    EXPO_CMD=(pnpm exec expo)
  elif find_up "yarn.lock" && command -v yarn >/dev/null 2>&1; then
    EXPO_CMD=(yarn expo)
  elif { find_up "bun.lock" || find_up "bun.lockb"; } && command -v bun >/dev/null 2>&1; then
    EXPO_CMD=(bunx expo)
  else
    EXPO_CMD=(npx expo)
  fi
}

run_doctor() {
  if find_up "pnpm-lock.yaml" && command -v pnpm >/dev/null 2>&1; then
    pnpm exec expo-doctor
  elif find_up "yarn.lock" && command -v yarn >/dev/null 2>&1; then
    yarn expo-doctor
  elif { find_up "bun.lock" || find_up "bun.lockb"; } && command -v bun >/dev/null 2>&1; then
    bunx expo-doctor
  else
    npx expo-doctor
  fi
}

resolve_expo_cmd

case "$MODE" in
  start|run)
    exec "${EXPO_CMD[@]}" start
    ;;
  --ios|ios)
    exec "${EXPO_CMD[@]}" start --ios
    ;;
  --android|android)
    exec "${EXPO_CMD[@]}" start --android
    ;;
  --web|web)
    exec "${EXPO_CMD[@]}" start --web
    ;;
  --dev-client|dev-client)
    exec "${EXPO_CMD[@]}" start --dev-client
    ;;
  --tunnel|tunnel)
    exec "${EXPO_CMD[@]}" start --tunnel
    ;;
  --export-web|export-web)
    exec "${EXPO_CMD[@]}" export --platform web
    ;;
  --doctor|doctor)
    run_doctor
    ;;
  --help|help)
    show_usage
    ;;
  *)
    show_usage >&2
    exit 2
    ;;
esac
