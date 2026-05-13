#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Claude Cowork Switch"
APP_DIR="$ROOT_DIR/dist/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
BUNDLED_APP_DIR="$RESOURCES_DIR/claude-cowork-switch"

rm -rf "$APP_DIR"
mkdir -p "$MACOS_DIR" "$BUNDLED_APP_DIR"

swiftc \
  "$ROOT_DIR/macos/ClaudeCoworkSwitch.swift" \
  -o "$MACOS_DIR/ClaudeCoworkSwitch" \
  -framework AppKit

cp "$ROOT_DIR/macos/Info.plist" "$CONTENTS_DIR/Info.plist"

rsync -a \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude 'data' \
  --exclude 'dist' \
  --exclude 'node_modules' \
  "$ROOT_DIR/src" \
  "$ROOT_DIR/public" \
  "$ROOT_DIR/package.json" \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/.env.example" \
  "$BUNDLED_APP_DIR/"

chmod +x "$MACOS_DIR/ClaudeCoworkSwitch"

if command -v codesign >/dev/null 2>&1; then
  codesign --force --deep --sign - "$APP_DIR" >/dev/null 2>&1 || true
fi

echo "$APP_DIR"
