#!/usr/bin/env bash
set -euo pipefail

# publish.sh - simple helper to create a GitHub repo and push this project
# Usage:
#   ./publish.sh <github-username> <repo-name>
# Or set env vars: GITHUB_USER and REPO

GITHUB_USER="${GITHUB_USER:-${1:-}}"
REPO="${REPO:-${2:-}}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed. Install git and re-run." >&2
  exit 1
fi

echo "Initializing local repo (if needed)..."
git init >/dev/null 2>&1 || true
git add -A
if [ -n "$(git status --porcelain)" ]; then
  git commit -m "Initial commit: UI OnBase Website" || true
else
  echo "No changes to commit."
fi

git branch -M main 2>/dev/null || true

if command -v gh >/dev/null 2>&1 && [ -z "$GITHUB_USER" ]; then
  echo "No GitHub username provided but 'gh' is available. Using interactive 'gh repo create'."
  gh repo create --public --source=. --remote=origin --push
  exit 0
fi

if command -v gh >/dev/null 2>&1 && [ -n "$GITHUB_USER" ] && [ -z "$REPO" ]; then
  echo "Creating repository using 'gh' for user: $GITHUB_USER"
  gh repo create "$GITHUB_USER/$(basename "$PWD")" --public --source=. --remote=origin --push
  exit 0
fi

if [ -z "$GITHUB_USER" ] || [ -z "$REPO" ]; then
  echo "Usage: $0 <github-username> <repo-name>" >&2
  echo "Or set environment variables GITHUB_USER and REPO." >&2
  exit 1
fi

REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO}.git"
echo "Adding remote: $REMOTE_URL"
if git remote | grep -q origin; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

echo "Pushing to origin/main..."
git push -u origin main

echo "Done. If you want GitHub Pages, check Actions tab after push (workflow included)."
