#!/usr/bin/env bash
# DBをバックアップし、Lightsailバケットへ送る。systemdタイマーから毎日実行する。
# 失敗するとsystemdがshift-management-backup-failure.serviceを起動して記録する。
# 使い方: sudo bash backup-db.sh [--local-only]
set -euo pipefail

# systemdから実行したときもsnapで入れたawsを見つけられるようにする
export PATH="$PATH:/snap/bin"

DB_NAME=shift_management
BACKUP_DIR=/var/backups/shift-management
BACKUP_ENV=/etc/shift-management/backup.env
STATE_DIR=/var/lib/shift-management
LOCAL_KEEP_DAYS=7
REMOTE_KEEP_DAYS=30

local_only=false
if [[ "${1:-}" == "--local-only" ]]; then
  local_only=true
fi

if [[ $EUID -ne 0 ]]; then
  echo "sudoで実行してください" >&2
  exit 1
fi

timestamp=$(TZ=Asia/Tokyo date +%Y%m%d-%H%M%S)
file="$BACKUP_DIR/${DB_NAME}_${timestamp}.dump"

# 途中で失敗したときに不完全なファイルを残さない
trap 'rm -f "$file.tmp"' EXIT

umask 077
sudo -u postgres pg_dump --format=custom "$DB_NAME" > "$file.tmp"
mv "$file.tmp" "$file"
echo "保存した: $file"

find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime +"$LOCAL_KEEP_DAYS" -delete

if $local_only; then
  exit 0
fi

# AWS_ACCESS_KEY_ID、AWS_SECRET_ACCESS_KEY、AWS_DEFAULT_REGION、BACKUP_BUCKET を読み込む
set -a
source "$BACKUP_ENV"
set +a

remote="s3://$BACKUP_BUCKET/db/$(basename "$file")"
aws s3 cp --only-show-errors "$file" "$remote"
echo "アップロードした: $remote"

# 外部保存まで成功した日時を記録する。backup-status.shがこれを見て古すぎないか判定する
mkdir -p "$STATE_DIR"
printf '%s %s\n' "$(date --iso-8601=seconds)" "$remote" > "$STATE_DIR/backup-last-success"

# ファイル名の日付で古いものを削除する
cutoff=$(TZ=Asia/Tokyo date -d "-$REMOTE_KEEP_DAYS days" +%Y%m%d)
aws s3 ls "s3://$BACKUP_BUCKET/db/" | awk '{print $4}' | while read -r name; do
  dumped_on=$(echo "$name" | sed -nE "s/^${DB_NAME}_([0-9]{8})-.*\.dump$/\1/p")
  if [[ -n "$dumped_on" && "$dumped_on" < "$cutoff" ]]; then
    aws s3 rm --only-show-errors "s3://$BACKUP_BUCKET/db/$name"
    echo "古いバックアップを削除した: $name"
  fi
done
