#!/usr/bin/env bash
# サーバーの初期設定。何度実行しても同じ状態になるように書いている。
# 使い方: sudo bash ~/shift-management-app/infra/server/setup.sh
# rootで動かすスクリプトを取り込むため、shiftappが書き換えられない管理用のチェックアウトから実行する。
set -euo pipefail

# ops.shを読み込む前の確認。ops.shはまだ信用できないため、ここに直接書く（deploy.shと同じ内容）。
# パスを/までさかのぼり、途中のシンボリックリンクは参照先も同じようにたどって、
# shiftappが所有している、または書き込めるものがあれば止める
assert_path_trusted() {
  local path="$1"
  local depth="${2:-0}"
  local app_user=shiftapp
  local target

  if (( depth > 20 )); then
    echo "シンボリックリンクが深すぎる: $1" >&2
    exit 1
  fi
  [[ "$path" == /* ]] || path="$PWD/$path"

  while true; do
    if [[ "$(stat -c %U "$path")" == "$app_user" ]] \
      || sudo -u "$app_user" test -w "$path" 2>/dev/null; then
      echo "$app_user が書き換えられる場所にある: $path" >&2
      echo "管理用のチェックアウト（~/shift-management-app）から実行すること" >&2
      exit 1
    fi

    if [[ -L "$path" ]]; then
      target=$(readlink "$path")
      [[ "$target" == /* ]] || target="$(dirname "$path")/$target"
      assert_path_trusted "$target" $((depth + 1))
    fi

    [[ "$path" == / ]] && break
    path=$(dirname "$path")
  done
}

if [[ $EUID -ne 0 ]]; then
  echo "sudoで実行してください" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
assert_path_trusted "${BASH_SOURCE[0]}"
assert_path_trusted "$SCRIPT_DIR/lib/ops.sh"

REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
# APP_USER、OPS_DIR、assert_not_writable_by_app、install_ops_filesを定義する
source "$SCRIPT_DIR/lib/ops.sh"

APP_HOME=/opt/shift-management
CONFIG_DIR=/etc/shift-management
BACKUP_DIR=/var/backups/shift-management

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
assert_not_writable_by_app "$REPO_DIR"

install -d -m 750 -o root -g "$APP_USER" "$CONFIG_DIR"
install -d -m 700 -o root -g root "$BACKUP_DIR"
install -d -m 700 -o root -g root /var/lib/shift-management

echo "== PostgreSQLはローカル接続のみ"
PG_CONF=$(sudo -u postgres psql -tAc "SHOW config_file")
if ! grep -Eq "^listen_addresses\s*=\s*'localhost'" "$PG_CONF"; then
  echo "listen_addresses = 'localhost'" >> "$PG_CONF"
  systemctl restart postgresql
fi

echo "== rootで実行するスクリプト、systemdの設定、SSHログイン時のバックアップ異常表示を配置"
install_ops_files "$SCRIPT_DIR"

echo "== ログの永続化"
# 再起動後もバックアップ失敗のログを確認できるよう、journaldのログをディスクに残す
mkdir -p /var/log/journal
systemd-tmpfiles --create --prefix /var/log/journal
systemctl restart systemd-journald

echo "== Nginxの設定を配置"
if [[ ! -e /etc/nginx/sites-available/shift-management ]]; then
  install -m 644 "$SCRIPT_DIR/nginx/shift-management.conf" /etc/nginx/sites-available/shift-management
  echo "※ /etc/nginx/sites-available/shift-management の server_name をドメインに書き換えること"
fi
ln -sf /etc/nginx/sites-available/shift-management /etc/nginx/sites-enabled/shift-management
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "== 完了。次は setup-db.sh を実行する"
