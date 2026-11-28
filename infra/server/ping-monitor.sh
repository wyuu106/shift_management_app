#!/usr/bin/env bash
# 外部の監視サービスへ「正常に終わった」という合図を送る。
# 監視サービス側は、合図が一定時間来なければメールで通知する設定にしておく。
# サーバーやタイマーが止まって、失敗の通知すら送れない場合にも気づけるようにするため。
# 使い方: sudo bash /usr/local/lib/shift-management/ping-monitor.sh <PING_URL_BACKUP|PING_URL_SERVER_CHECK>
# 合図の送り先は /etc/shift-management/monitor.env に書く。未設定なら何もしない。
set -euo pipefail

MONITOR_ENV=/etc/shift-management/monitor.env

name="${1:-}"
case "$name" in
  PING_URL_BACKUP | PING_URL_SERVER_CHECK) ;;
  *)
    echo "合図の種類が正しくない: ${name:-なし}" >&2
    exit 1
    ;;
esac

if [[ ! -f "$MONITOR_ENV" ]]; then
  echo "$MONITOR_ENV がないため、監視サービスへ合図を送らない"
  exit 0
fi

# shellcheck source=/dev/null
source "$MONITOR_ENV"
url="${!name:-}"

if [[ -z "$url" ]]; then
  echo "$name が未設定のため、監視サービスへ合図を送らない"
  exit 0
fi

if [[ "$url" != https://* ]]; then
  echo "$name はhttps://で始まるURLにすること" >&2
  exit 1
fi

# URL自体が秘密の値なので、失敗してもURLを表示しない
if ! curl -fsS -m 10 --retry 3 -o /dev/null "$url" 2>/dev/null; then
  echo "監視サービスへ合図を送れなかった（$name）" >&2
  exit 1
fi

echo "監視サービスへ合図を送った（$name）"
