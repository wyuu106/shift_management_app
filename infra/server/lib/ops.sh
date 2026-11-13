# setup.sh と deploy.sh から読み込む共通処理。rootで実行する。
# 単体では実行しない。
#
# 配置元が書き換えられていれば、このファイルも呼び出し元も信用できない。
# そのため確認処理は「書き換えられた状態で実行してしまう」ミスを止めるためのもので、
# 管理用のチェックアウトから実行することが前提になる。

APP_USER=shiftapp
# rootで実行するスクリプトの置き場。親ディレクトリも含めてrootだけが書き換えられる
OPS_DIR=/usr/local/lib/shift-management

# 指定したディレクトリ配下（.gitを含む）とその親を、shiftappが書き換えられないことを確認する
assert_not_writable_by_app() {
  local path="$1"
  local found

  found=$(
    find "$path" -user "$APP_USER"
    sudo -u "$APP_USER" find "$path" -writable 2>/dev/null || true
  )
  if [[ -n "$found" ]]; then
    echo "$APP_USER が書き換えられるファイルがある:" >&2
    echo "$found" | head -n 10 >&2
    echo "管理用のチェックアウト（~/shift-management-app）から実行すること" >&2
    exit 1
  fi

  while [[ "$path" != / ]]; do
    path=$(dirname "$path")
    if [[ "$(stat -c %U "$path")" == "$APP_USER" ]] || sudo -u "$APP_USER" test -w "$path"; then
      echo "$APP_USER が書き換えられるディレクトリにある: $path" >&2
      echo "管理用のチェックアウト（~/shift-management-app）から実行すること" >&2
      exit 1
    fi
  done
}

# rootで実行するスクリプト、systemdの設定、SSHログイン時の表示を配置する
install_ops_files() {
  local script_dir="$1"

  install -d -m 755 -o root -g root "$OPS_DIR"
  install -m 755 -o root -g root \
    "$script_dir/backup-db.sh" \
    "$script_dir/backup-status.sh" \
    "$script_dir/restore-db.sh" \
    "$OPS_DIR/"
  install -m 644 "$script_dir"/systemd/*.service "$script_dir"/systemd/*.timer /etc/systemd/system/
  install -m 755 "$script_dir/motd/90-shift-management-backup" /etc/update-motd.d/
  systemctl daemon-reload
}
