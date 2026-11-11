#!/usr/bin/env bash
# サーバーの初期設定。何度実行しても同じ状態になるように書いている。
# 使い方: sudo bash infra/server/setup.sh
set -euo pipefail

APP_USER=shiftapp
APP_HOME=/opt/shift-management
CONFIG_DIR=/etc/shift-management
BACKUP_DIR=/var/backups/shift-management
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "sudoで実行してください" >&2
  exit 1
fi

echo "== パッケージのインストール"
apt-get update
apt-get install -y \
  nginx \
  postgresql \
  python3-venv \
  git \
  certbot \
  python3-certbot-nginx \
  ufw \
  unattended-upgrades

# Ubuntu 24.04のaptにはAWS CLIがないためsnapで入れる（バックアップのアップロードに使う）
if ! command -v aws >/dev/null; then
  snap install aws-cli --classic
fi

echo "== OSのセキュリティ更新を自動適用"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== ファイアウォール（Lightsail側と二重に制限する）"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "== アプリ用ユーザーとディレクトリ"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$APP_HOME" --shell /bin/bash "$APP_USER"
fi

install -d -m 750 -o root -g "$APP_USER" "$CONFIG_DIR"
install -d -m 700 -o root -g root "$BACKUP_DIR"
install -d -m 700 -o root -g root /var/lib/shift-management

echo "== PostgreSQLはローカル接続のみ"
PG_CONF=$(sudo -u postgres psql -tAc "SHOW config_file")
if ! grep -Eq "^listen_addresses\s*=\s*'localhost'" "$PG_CONF"; then
  echo "listen_addresses = 'localhost'" >> "$PG_CONF"
  systemctl restart postgresql
fi

echo "== systemdとNginxの設定を配置"
install -m 644 "$SCRIPT_DIR"/systemd/*.service "$SCRIPT_DIR"/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload

echo "== ログの永続化とバックアップ異常の表示"
# 再起動後もバックアップ失敗のログを確認できるよう、journaldのログをディスクに残す
mkdir -p /var/log/journal
systemd-tmpfiles --create --prefix /var/log/journal
systemctl restart systemd-journald
# SSHログイン時にバックアップの異常を表示する
install -m 755 "$SCRIPT_DIR/motd/90-shift-management-backup" /etc/update-motd.d/

if [[ ! -e /etc/nginx/sites-available/shift-management ]]; then
  install -m 644 "$SCRIPT_DIR/nginx/shift-management.conf" /etc/nginx/sites-available/shift-management
  echo "※ /etc/nginx/sites-available/shift-management の server_name をドメインに書き換えること"
fi
ln -sf /etc/nginx/sites-available/shift-management /etc/nginx/sites-enabled/shift-management
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "== 完了。次は setup-db.sh を実行する"
