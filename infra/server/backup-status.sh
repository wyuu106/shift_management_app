#!/usr/bin/env bash
# バックアップの状態を表示する。最後の外部保存から26時間以上たっていれば異常とする。
# 使い方:
#   sudo bash backup-status.sh                  状態と直近のログを表示（異常なら終了コード1）
#   sudo bash backup-status.sh --brief          1行だけ表示（SSHログイン時のメッセージ用）
#   sudo bash backup-status.sh --record-failure 失敗を記録（systemdのOnFailureから呼ばれる）
set -euo pipefail

STATE_DIR=/var/lib/shift-management
SUCCESS_FILE="$STATE_DIR/backup-last-success"
FAILURE_FILE="$STATE_DIR/backup-last-failure"
MAX_AGE_HOURS=26

mode="${1:-}"

if [[ "$mode" == "--record-failure" ]]; then
  mkdir -p "$STATE_DIR"
  date --iso-8601=seconds > "$FAILURE_FILE"
  logger -p user.err -t shift-management-backup \
    "DBバックアップが失敗した。journalctl -u shift-management-backup -n 50 で確認すること"
  exit 0
fi

status="OK"
message=""

if [[ ! -f "$SUCCESS_FILE" ]]; then
  status="NG"
  message="外部へのバックアップが一度も成功していない"
else
  read -r last_success remote < "$SUCCESS_FILE"
  age_hours=$(( ($(date +%s) - $(date -d "$last_success" +%s)) / 3600 ))
  message="最後の外部保存: $last_success（${age_hours}時間前） $remote"

  if (( age_hours >= MAX_AGE_HOURS )); then
    status="NG"
  fi
fi

if [[ -f "$FAILURE_FILE" ]]; then
  last_failure=$(cat "$FAILURE_FILE")
  if [[ ! -f "$SUCCESS_FILE" || "$last_failure" > "$(cut -d' ' -f1 "$SUCCESS_FILE")" ]]; then
    status="NG"
    message="$message / 最後の失敗: $last_failure"
  fi
fi

if [[ "$mode" == "--brief" ]]; then
  if [[ "$status" == "NG" ]]; then
    echo "[警告] DBバックアップ異常: $message"
    echo "       sudo bash /opt/shift-management/app/infra/server/backup-status.sh で詳細を確認"
  fi
  exit 0
fi

echo "バックアップ状態: $status"
echo "$message"
echo
systemctl list-timers shift-management-backup.timer --no-pager
echo
journalctl -u shift-management-backup -u shift-management-backup-failure -n 30 --no-pager

[[ "$status" == "OK" ]]
