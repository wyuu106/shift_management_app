#!/usr/bin/env bash
# アプリを更新する。バックアップ → 取得 → 依存更新 → マイグレーション → 再起動 の順に行う。
# 使い方: sudo bash /opt/shift-management/app/infra/server/deploy.sh
#
# 処理の途中でgit pullがこのファイル自体を書き換えるため、全体をmain関数にまとめている。
# bashは関数を最後まで読み込んでから実行するので、書き換え後の内容が途中から混ざらない。
set -euo pipefail

APP_USER=shiftapp
APP_DIR=/opt/shift-management/app
VENV=/opt/shift-management/venv
ENV_FILE=/etc/shift-management/backend.env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

run_as_app() {
  sudo -u "$APP_USER" "$@"
}

main() {
  if [[ $EUID -ne 0 ]]; then
    echo "sudoで実行してください" >&2
    exit 1
  fi

  echo "== マイグレーション前にバックアップ"
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'shift_management'" | grep -q 1; then
    bash "$SCRIPT_DIR/backup-db.sh" --local-only
  fi

  echo "== コードを取得"
  run_as_app git -C "$APP_DIR" pull --ff-only

  echo "== systemdの設定を更新"
  install -m 644 "$SCRIPT_DIR"/systemd/*.service "$SCRIPT_DIR"/systemd/*.timer /etc/systemd/system/
  systemctl daemon-reload

  echo "== 依存パッケージ"
  if [[ ! -d "$VENV" ]]; then
    run_as_app python3 -m venv "$VENV"
  fi
  run_as_app "$VENV/bin/pip" install --quiet -r "$APP_DIR/backend/requirements.txt"

  echo "== マイグレーション"
  run_as_app bash -c "
    set -a && source '$ENV_FILE' && set +a
    cd '$APP_DIR/backend' && '$VENV/bin/alembic' upgrade head
  "

  echo "== 再起動"
  systemctl enable --now shift-management
  systemctl restart shift-management

  for _ in $(seq 1 10); do
    if curl -fsS -o /dev/null http://127.0.0.1:8000/docs; then
      echo "== 起動を確認した"
      exit 0
    fi
    sleep 2
  done

  echo "起動を確認できない。journalctl -u shift-management -n 50 でログを見ること" >&2
  exit 1
}

main "$@"; exit $?
