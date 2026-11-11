#!/usr/bin/env bash
# バックアップからDBを復旧する。現在のDBの中身はバックアップの内容で上書きされる。
# 復元の成否にかかわらず、DBの正常性を確認できたときだけアプリを起動する。
# 確認できない場合はアプリを停止したままにする。
# 使い方:
#   sudo bash restore-db.sh /var/backups/shift-management/shift_management_20261112-030000.dump
#   sudo bash restore-db.sh s3://<バケット名>/db/shift_management_20261112-030000.dump
set -euo pipefail

export PATH="$PATH:/snap/bin"

APP_USER=shiftapp
APP_DIR=/opt/shift-management/app
VENV=/opt/shift-management/venv
ENV_FILE=/etc/shift-management/backend.env
DB_NAME=shift_management
DB_USER=shift_app
BACKUP_ENV=/etc/shift-management/backup.env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TABLES=(users user_requests shift_periods business_dates shift_request_versions shift_requests shifts)

app_stopped=false

on_exit() {
  rm -rf "$work_dir"
  if $app_stopped; then
    echo "[エラー] アプリは停止中のまま。DBを確認してから systemctl start shift-management を実行すること" >&2
  fi
}

psql_db() {
  sudo -u postgres psql -v ON_ERROR_STOP=1 -tAX -d "$DB_NAME" "$@"
}

# アプリのコードが期待するスキーマのバージョンと一致し、全テーブルを読めるかを確認する
check_db_health() {
  local expected actual table

  expected=$(sudo -u "$APP_USER" bash -c "
    set -a && source '$ENV_FILE' && set +a
    cd '$APP_DIR/backend' && '$VENV/bin/alembic' heads
  " | awk '{print $1}')

  if ! actual=$(psql_db -c "SELECT version_num FROM alembic_version"); then
    echo "alembic_versionを読めない" >&2
    return 1
  fi

  if [[ -z "$expected" || "$actual" != "$expected" ]]; then
    echo "スキーマのバージョンが一致しない（DB: ${actual:-なし}、コード: ${expected:-不明}）" >&2
    echo "古いバックアップなら alembic upgrade head が必要" >&2
    return 1
  fi

  for table in "${TABLES[@]}"; do
    if ! psql_db -c "SELECT count(*) FROM \"$table\"" > /dev/null; then
      echo "テーブル $table を読めない" >&2
      return 1
    fi
  done
}

if [[ $EUID -ne 0 ]]; then
  echo "sudoで実行してください" >&2
  exit 1
fi

source_path="${1:?復旧するバックアップファイルを指定してください}"
work_dir=$(mktemp -d)
trap on_exit EXIT

if [[ "$source_path" == s3://* ]]; then
  set -a
  source "$BACKUP_ENV"
  set +a
  aws s3 cp --only-show-errors "$source_path" "$work_dir/restore.dump"
else
  cp "$source_path" "$work_dir/restore.dump"
fi
chmod 644 "$work_dir/restore.dump"
chmod 755 "$work_dir"

# 中身を読めるか先に確認する
sudo -u postgres pg_restore --list "$work_dir/restore.dump" > /dev/null

echo "DB $DB_NAME を $source_path の内容で上書きする。"
read -r -p "続けるならDB名（$DB_NAME）を入力: " answer
if [[ "$answer" != "$DB_NAME" ]]; then
  echo "中止した"
  exit 1
fi

echo "== 念のため現在のDBを保存"
bash "$SCRIPT_DIR/backup-db.sh" --local-only

echo "== アプリを止めて復元"
systemctl stop shift-management
app_stopped=true

# 1トランザクションで復元するため、失敗した場合は復元前の状態に戻る
restored=true
if ! sudo -u postgres pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --role="$DB_USER" \
  --single-transaction \
  --exit-on-error \
  --dbname="$DB_NAME" \
  "$work_dir/restore.dump"; then
  restored=false
  echo "[エラー] 復元に失敗した。変更はロールバックされているはず" >&2
fi

echo "== DBの正常性を確認"
if ! check_db_health; then
  echo "[エラー] DBの正常性を確認できないため、アプリを起動しない" >&2
  exit 1
fi

systemctl start shift-management
app_stopped=false

if ! $restored; then
  echo "[エラー] 復元は失敗した。DBは復元前の状態で正常なため、アプリは再開した" >&2
  exit 1
fi

echo "== 復旧した。画面でログインとシフト表示を確認すること"
