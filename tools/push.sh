#!/usr/bin/env bash
# AGIMAT ONLINE — push helper.
#
# WHY THIS EXISTS: the Arena workspace snapshot deliberately strips .git/config
# (it is a credential path), so the remote URL does not survive between chat
# sessions even though the rest of .git does. This script re-adds it.
#
#   ./tools/push.sh              # re-add remote, show what would push
#   ./tools/push.sh --push       # actually push (will prompt for a token)
#
# Token: https://github.com/settings/tokens  →  Fine-grained token
#   Repository access: Only select repositories → mbpony/Agimat-online
#   Permissions:       Contents = Read and write   (nothing else)
# Username: mbpony     Password: <paste the token>
#
# NOTE: pushing to main triggers Render auto-deploy (render.yaml: autoDeploy true).
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE_URL="https://github.com/mbpony/Agimat-online.git"

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE_URL"
  echo "[push] re-added origin -> $REMOTE_URL"
else
  echo "[push] origin already set -> $(git remote get-url origin)"
fi

echo
echo "[push] fetching remote state (read-only)..."
git fetch --depth=50 origin main 2>/dev/null || {
  echo "[push] fetch failed — likely needs auth, or offline. Continuing with local refs."
}

echo
echo "[push] local  HEAD : $(git rev-parse --short HEAD)  $(git log -1 --pretty=%s | cut -c1-60)"
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  echo "[push] remote HEAD : $(git rev-parse --short origin/main)"
  echo
  echo "[push] commits that would be pushed:"
  git log --oneline origin/main..HEAD | sed 's/^/         /'
  echo
  echo "[push] files that would change:"
  git diff --stat origin/main..HEAD | sed 's/^/         /'
fi

if [[ "${1:-}" == "--push" ]]; then
  echo
  echo "[push] pushing to origin main ..."
  git push origin main
  echo "[push] done — Render should auto-deploy in ~2-3 min."
  echo "[push] watch: https://dashboard.render.com  and  https://agimat-online.onrender.com/api/health"
else
  echo
  echo "[push] dry run only. Re-run with --push to actually push."
fi
