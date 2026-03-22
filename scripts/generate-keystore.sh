#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-keystore.sh
#
# Generates a release keystore for signing production APKs and prints the
# GitHub secrets you need to add.
#
# Usage:
#   bash scripts/generate-keystore.sh
#
# Requirements: keytool (ships with every JDK)
# ─────────────────────────────────────────────────────────────────────────────
set -e

KEYSTORE_FILE="android/app/release.keystore"
KEY_ALIAS="dungeonfit-release"
STORE_PASS="$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 24)"
KEY_PASS="$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 24)"

echo ""
echo "⚔️  DungeonFit — Release Keystore Generator"
echo "─────────────────────────────────────────────"
echo ""

# Generate the keystore
keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=DungeonFit, OU=Mobile, O=DungeonFit, L=Unknown, S=Unknown, C=US"

echo ""
echo "✅  Keystore created at $KEYSTORE_FILE"
echo ""
echo "─────────────────────────────────────────────"
echo "Add these secrets to GitHub:"
echo "  Settings → Secrets and variables → Actions → New repository secret"
echo "─────────────────────────────────────────────"
echo ""
echo "ANDROID_KEYSTORE_BASE64"
echo "  $(base64 -w 0 "$KEYSTORE_FILE")"
echo ""
echo "ANDROID_KEY_ALIAS"
echo "  $KEY_ALIAS"
echo ""
echo "ANDROID_STORE_PASSWORD"
echo "  $STORE_PASS"
echo ""
echo "ANDROID_KEY_PASSWORD"
echo "  $KEY_PASS"
echo ""
echo "─────────────────────────────────────────────"
echo "⚠️  Save these values somewhere safe — the passwords cannot be recovered."
echo "⚠️  Add release.keystore to .gitignore (already done)."
echo ""
