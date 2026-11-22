#!/usr/bin/env bash
# ディスクの空きと証明書の期限を確認する。systemdタイマーから毎日実行する。
# 正常なら監視サービスへ合図を送る。異常なら送らず、監視サービス側の通知に任せる。
# root管理のディレクトリへsetup.sh・deploy.shが配置したものを実行する。
# 使い方:
#   sudo bash /usr/local/lib/shift-management/server-check.sh          確認して結果を表示（異常なら終了コード1）
#   sudo bash /usr/local/lib/shift-management/server-check.sh --brief  異常だけを表示（SSHログイン時のメッセージ用）
set -euo pipefail

OPS_DIR=/usr/local/lib/shift-management
CERT_DIR=/etc/letsencrypt/live
DISK_MAX_PERCENT=80
CERT_MIN_DAYS=14

mode="${1:-}"
problems=()

disk_percent=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
if (( disk_percent >= DISK_MAX_PERCENT )); then
  problems+=("ディスクの使用率が${disk_percent}%（${DISK_MAX_PERCENT}%以上）")
fi

# 自動更新が失敗し続けると期限が切れ、ブラウザがAPIを拒否する。切れる前に気づけるようにする
cert_count=0
for cert in "$CERT_DIR"/*/cert.pem; do
  [[ -e "$cert" ]] || continue
  cert_count=$((cert_count + 1))

  if ! openssl x509 -checkend $((CERT_MIN_DAYS * 86400)) -noout -in "$cert" > /dev/null; then
    domain=$(basename "$(dirname "$cert")")
    problems+=("証明書の期限まで${CERT_MIN_DAYS}日を切っている: $domain")
  fi
done

if (( cert_count == 0 )); then
  problems+=("証明書がない（certbot --nginx をまだ実行していない）")
fi

if [[ "$mode" == "--brief" ]]; then
  if (( ${#problems[@]} > 0 )); then
    printf '[警告] %s\n' "${problems[@]}"
    echo "       sudo bash $OPS_DIR/server-check.sh で詳細を確認"
  fi
  exit 0
fi

echo "ディスクの使用率: ${disk_percent}%"
echo "証明書: ${cert_count}件"

if (( ${#problems[@]} > 0 )); then
  for problem in "${problems[@]}"; do
    echo "[異常] $problem" >&2
    logger -p user.err -t shift-management-server-check "$problem"
  done
  exit 1
fi

echo "サーバーの状態: OK"
bash "$OPS_DIR/ping-monitor.sh" PING_URL_SERVER_CHECK
