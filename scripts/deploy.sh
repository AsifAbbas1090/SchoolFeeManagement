#!/usr/bin/env bash
# Update the live server to the latest code on GitHub (main).
# Run on the server:  sudo bash /srv/school-fee-system/scripts/deploy.sh
#
# Safe order: pull -> install -> migrate -> build -> restart -> health check.
# If install/migrate/build fails, the script stops and the running site keeps serving the old build.
set -euo pipefail

APP_DIR=/srv/school-fee-system
APP_USER=feeapp
SERVICE=school-fee

as_app() { sudo -u "$APP_USER" -H bash -c "cd $APP_DIR && $*"; }

echo "==> Pulling latest code"
as_app "git fetch --quiet origin main && git reset --hard --quiet origin/main"
as_app "git log --format='    %h %an: %s' -1"

echo "==> Installing dependencies (exact lockfile versions)"
as_app "npm ci --no-audit --no-fund --loglevel=error"

echo "==> Database migrations"
as_app "npx prisma generate >/dev/null && npx prisma migrate deploy"

echo "==> Building"
as_app "NODE_ENV=production npx next build >/tmp/school-fee-build.log 2>&1" || {
  echo "!! Build failed — site is still running the previous version. Log: /tmp/school-fee-build.log"
  tail -30 /tmp/school-fee-build.log
  exit 1
}

echo "==> Restarting"
systemctl restart "$SERVICE"

echo "==> Health check"
for i in $(seq 1 20); do
  if out=$(curl -fsS -m 5 http://127.0.0.1:3000/api/health 2>/dev/null); then
    echo "    $out"
    echo "==> Deployed."
    exit 0
  fi
  sleep 2
done
echo "!! App did not come back healthy. Check: journalctl -u $SERVICE -n 50"
exit 1
