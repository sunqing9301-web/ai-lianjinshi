#!/usr/bin/env bash
set -euo pipefail

# Workspace root
ROOT_DIR="/workspace"
cd "$ROOT_DIR"

# Ensure git user config exists (local to repo)
if ! git config user.email >/dev/null 2>&1; then
  git config user.email "auto-commit@local"
fi
if ! git config user.name >/dev/null 2>&1; then
  git config user.name "Auto Commit Bot"
fi

echo "[auto-commit] starting watcher in $ROOT_DIR"

while true; do
  # Any changes (modified, added, deleted, untracked)
  if [ -n "$(git status --porcelain)" ]; then
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    msg="chore(auto-commit): save changes at ${ts}"

    echo "[auto-commit] changes detected -> committing: $msg"
    git add -A || true
    git commit -m "$msg" || echo "[auto-commit] nothing to commit"

    if git remote get-url origin >/dev/null 2>&1; then
      echo "[auto-commit] pushing to origin $branch"
      git push origin "$branch" || echo "[auto-commit] push failed (will retry later)"
    else
      echo "[auto-commit] no remote 'origin' configured; skipping push"
    fi
  fi

  sleep 10
done

