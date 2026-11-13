#!/usr/bin/env bash
# アプリを更新する。確認 → 取得 → スクリプト配置 → バックアップ → 依存更新 → マイグレーション → 再起動 の順に行う。
# 使い方:
#   git -C ~/shift-management-app pull --ff-only
#   sudo bash ~/shift-management-app/infra/server/deploy.sh
#
# rootで動かすスクリプトとsystemdの設定は、shiftappが書き換えられない管理用のチェックアウト
# （このファイルがあるリポジトリ）から取り込む。アプリ用のチェックアウトは同じコミットにそろえる。
# 途中まで適用された状態を残さないよう、変更を加える前に確認をすべて済ませる。
set -euo pipefail

APP_DIR=/opt/shift-management/app
VENV=/opt/shift-management/venv
ENV_FILE=/etc/shift-management/backend.env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
# APP_USER、OPS_DIR、assert_not_writable_by_app、install_ops_filesを定義する
source "$SCRIPT_DIR/lib/ops.sh"

run_as_app() {
  sudo -u "$APP_USER" "$@"
}

# 管理用のチェックアウトは別ユーザーの所有なので、このリポジトリに限って所有者の確認を外す。
# rootが.git/indexを書き換えて所有者を変えないよう、読み取りだけにする
ops_git() {
  git --no-optional-locks -c safe.directory="$REPO_DIR" -C "$REPO_DIR" "$@"
}

main() {
  if [[ $EUID -ne 0 ]]; then
    echo "sudoで実行してください" >&2
    exit 1
  fi

  echo "== 管理用のチェックアウトを確認"
  assert_not_writable_by_app "$REPO_DIR"

  # コミットされていない変更があると、コミットと異なる内容をrootで配置してしまう
  local dirty
  dirty=$(ops_git status --porcelain)
  if [[ -n "$dirty" ]]; then
    echo "管理用のチェックアウトにコミットされていない変更がある:" >&2
    echo "$dirty" >&2
    exit 1
  fi

  local ops_commit
  ops_commit=$(ops_git rev-parse HEAD)

  echo "== アプリ用のチェックアウトを確認（目標のコミット: ${ops_commit:0:12}）"
  run_as_app git -C "$APP_DIR" fetch --quiet origin

  if [[ -n "$(run_as_app git -C "$APP_DIR" status --porcelain --untracked-files=no)" ]]; then
    echo "アプリ用のチェックアウトにコミットされていない変更がある" >&2
    exit 1
  fi

  if ! run_as_app git -C "$APP_DIR" merge-base --is-ancestor HEAD "$ops_commit"; then
    echo "アプリ用のチェックアウトを ${ops_commit:0:12} へ進められない" >&2
    echo "管理用のチェックアウトが古いか、originにないコミットを含んでいる" >&2
    echo "git -C ~/shift-management-app pull --ff-only を実行してからやり直すこと" >&2
    exit 1
  fi

  echo "== コードを取得"
  run_as_app git -C "$APP_DIR" merge --ff-only --quiet "$ops_commit"

  echo "== rootで実行するスクリプトとsystemdの設定を更新"
  install_ops_files "$SCRIPT_DIR"

  echo "== マイグレーション前にバックアップ"
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'shift_management'" | grep -q 1; then
    bash "$OPS_DIR/backup-db.sh" --local-only
  fi

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
