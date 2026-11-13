#!/usr/bin/env bash
# DBと接続ユーザーを作り、アプリの環境変数ファイルを用意する。
# パスワードとSECRET_KEYはここで生成し、画面には表示しない。
# 使い方: sudo bash infra/server/setup-db.sh
set -euo pipefail

APP_USER=shiftapp
DB_NAME=shift_management
DB_USER=shift_app
ENV_FILE=/etc/shift-management/backend.env

if [[ $EUID -ne 0 ]]; then
  echo "sudoで実行してください" >&2
  exit 1
fi

role_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'")

if [[ "$role_exists" == "1" ]]; then
  echo "DBユーザー $DB_USER は作成済みのため変更しない"
else
  # URLにそのまま入れられるよう英数字だけのパスワードにする
  db_password=$(openssl rand -hex 24)

  # パスワードはコマンド引数に載せず、組み込みのprintfから標準入力で渡す。
  # 失敗時もSQL文（パスワード入り）がエラー表示やサーバーログに出ないようにする。
  # -X: .psqlrcのECHO設定などでSQL文が表示されないよう読み込まない
  printf '%s\n' \
    '\set VERBOSITY terse' \
    "\\set password '$db_password'" \
    "SET log_min_error_statement = 'panic';" \
    "SET log_statement = 'none';" \
    "CREATE ROLE :\"user\" LOGIN PASSWORD :'password';" \
    | sudo -u postgres psql -X -v ON_ERROR_STOP=1 -v user="$DB_USER"
  echo "DBユーザー $DB_USER を作成した"
fi

db_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")

if [[ "$db_exists" != "1" ]]; then
  sudo -u postgres createdb --owner "$DB_USER" "$DB_NAME"
  echo "DB $DB_NAME を作成した"
fi

if [[ -e "$ENV_FILE" ]]; then
  echo "$ENV_FILE は作成済みのため変更しない"
  exit 0
fi

if [[ -z "${db_password:-}" ]]; then
  echo "DBユーザーが既にあるためパスワードがわからない。$ENV_FILE を手動で作成すること" >&2
  exit 1
fi

umask 027
cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql+psycopg2://$DB_USER:$db_password@127.0.0.1:5432/$DB_NAME
SECRET_KEY=$(openssl rand -hex 32)
# VercelのURL。複数ある場合はカンマ区切り（末尾の/は付けない）
ALLOW_ORIGINS=https://example.vercel.app
EOF
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

echo "$ENV_FILE を作成した。ALLOW_ORIGINS をVercelのURLに書き換えること"
