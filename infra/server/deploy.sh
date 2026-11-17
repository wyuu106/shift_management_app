#!/usr/bin/env bash
# アプリを更新する。次の順に行う。
#   1. 確認: 管理用・アプリ用のチェックアウトの状態
#   2. 事前リハーサル: バックアップを一時DBへ復元し、新しいコードのマイグレーションを試す。
#      失敗したら本番には触れずに中止する
#   3. アプリを止めてバックアップ
#   4. コード取得 → スクリプト配置 → 依存更新 → マイグレーション → 起動 → 起動確認
#   5. 4で失敗したら、コードと依存パッケージを元のコミットへ戻し、3のバックアップからDBを復元して起動する
# 3〜4の間（数十秒）はAPIが止まる。
# 使い方:
#   git -C ~/shift-management-app pull --ff-only
#   sudo bash ~/shift-management-app/infra/server/deploy.sh
#
# rootで動かすスクリプトとsystemdの設定は、shiftappが書き換えられない管理用のチェックアウト
# （このファイルがあるリポジトリ）から取り込む。アプリ用のチェックアウトは同じコミットにそろえる。
# 途中まで適用された状態を残さないよう、変更を加える前に確認をすべて済ませる。
set -euo pipefail

# ops.shを読み込む前の確認。ops.shはまだ信用できないため、ここに直接書く（setup.shと同じ内容）。
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

APP_DIR=/opt/shift-management/app
VENV=/opt/shift-management/venv
ENV_FILE=/etc/shift-management/backend.env
DB_NAME=shift_management
DB_USER=shift_app
APP_URL=http://127.0.0.1:8000
# 事前リハーサル用。本番のDB・コード・venvとは別に用意し、動いているアプリに影響させない
REHEARSAL_DB=shift_management_rehearsal
REHEARSAL_DIR=/opt/shift-management/rehearsal
REHEARSAL_VENV=/opt/shift-management/venv-rehearsal
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

  if ! db_exists; then
    echo "DB $DB_NAME がない。先に setup-db.sh を実行すること" >&2
    exit 1
  fi

  local status

  # ifの条件の中で関数を呼ぶと、関数内のset -e（失敗したら止まる設定）が効かなくなる。
  # 途中の失敗を見逃さないよう、条件の外でサブシェルとして実行し、終了コードを受け取る
  echo "== 事前リハーサル（本番のDBには触れない）"
  trap cleanup_rehearsal EXIT
  set +e
  ( set -e; rehearse "$ops_commit" )
  status=$?
  set -e
  cleanup_rehearsal
  trap - EXIT

  if (( status != 0 )); then
    echo "[エラー] 事前リハーサルに失敗した。本番は何も変更していない" >&2
    exit 1
  fi

  local prev_commit
  local had_schema=false
  prev_commit=$(run_as_app git -C "$APP_DIR" rev-parse HEAD)
  if has_schema; then
    had_schema=true
  fi

  # 止めてからバックアップを取る。バックアップ後の書き込みが、戻したときに消えないようにするため
  echo "== アプリを止めてバックアップ"
  systemctl stop shift-management

  local backup_file
  if ! backup_file=$(take_backup) || [[ ! -f "$backup_file" ]]; then
    echo "[エラー] バックアップに失敗した。何も変更していないため、アプリを再開する" >&2
    systemctl start shift-management
    exit 1
  fi

  set +e
  ( set -e; apply_update "$ops_commit" )
  status=$?
  set -e

  if (( status == 0 )); then
    echo "== デプロイが完了した（${ops_commit:0:12}）"
    exit 0
  fi

  echo "[エラー] デプロイに失敗した。デプロイ前の状態（${prev_commit:0:12}）へ戻す" >&2
  set +e
  ( set -e; roll_back "$prev_commit" "$had_schema" "$backup_file" )
  status=$?
  set -e

  if (( status == 0 )); then
    echo "[エラー] デプロイは失敗したが、デプロイ前の状態へ戻してアプリを再開した" >&2
    echo "         journalctl -u shift-management -n 50 と上の出力で原因を確認すること" >&2
  else
    echo "[エラー] デプロイに失敗し、元に戻すこともできなかった。アプリは停止している可能性がある" >&2
    echo "         デプロイ前のバックアップ: $backup_file" >&2
    echo "         デプロイ前のコミット: $prev_commit" >&2
  fi
  exit 1
}

db_exists() {
  sudo -u postgres psql -tAX -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1
}

# マイグレーションを一度でも適用したDBか（初回デプロイの空のDBではfalse）
has_schema() {
  sudo -u postgres psql -tAX -d "$DB_NAME" \
    -c "SELECT to_regclass('public.alembic_version') IS NOT NULL" | grep -q t
}

# サーバー内にバックアップを取り、保存したファイルのパスだけを標準出力へ返す
take_backup() {
  local output
  output=$(bash "$OPS_DIR/backup-db.sh" --local-only)
  echo "$output" >&2
  echo "$output" | sed -n 's/^保存した: //p'
}

install_requirements() {
  local venv="$1"
  local code_dir="$2"

  if [[ ! -d "$venv" ]]; then
    run_as_app python3 -m venv "$venv"
  fi
  run_as_app "$venv/bin/pip" install --quiet -r "$code_dir/backend/requirements.txt"
}

# 指定したDBへマイグレーションを適用する。接続先はbackend.envのDATABASE_URLのDB名だけを差し替えて作る。
# パスワードを含むURLをコマンド引数に載せないよう、差し替えはshiftappのシェルの中で行う
run_migration() {
  local venv="$1"
  local code_dir="$2"
  local db_name="$3"

  run_as_app bash -c "
    set -euo pipefail
    set -a && source '$ENV_FILE' && set +a

    if [[ \"\$DATABASE_URL\" != */$DB_NAME ]]; then
      echo 'DATABASE_URLが /$DB_NAME で終わっていないため、接続先を判定できない' >&2
      exit 1
    fi
    export DATABASE_URL=\"\${DATABASE_URL%/*}/$db_name\"

    cd '$code_dir/backend' && '$venv/bin/alembic' upgrade head
  "
}

# 応答するまで待つ。残りの引数はcurlへ渡す
wait_for_app() {
  for _ in $(seq 1 10); do
    if curl "$@" -o /dev/null 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

cleanup_rehearsal() {
  run_as_app git -C "$APP_DIR" worktree remove --force "$REHEARSAL_DIR" 2>/dev/null || true
  run_as_app git -C "$APP_DIR" worktree prune || true
  sudo -u postgres dropdb --if-exists "$REHEARSAL_DB" || true
}

# 本番のデータでだけ失敗するマイグレーションを、本番を変更する前に見つける
rehearse() {
  local ops_commit="$1"
  local dump

  cleanup_rehearsal

  dump=$(take_backup)
  if [[ ! -f "$dump" ]]; then
    echo "リハーサル用のバックアップを取れなかった" >&2
    return 1
  fi

  sudo -u postgres createdb --owner "$DB_USER" "$REHEARSAL_DB"
  # ダンプはrootだけが読めるため、rootが開いて標準入力で渡す
  sudo -u postgres pg_restore \
    --no-owner \
    --role="$DB_USER" \
    --exit-on-error \
    --dbname="$REHEARSAL_DB" \
    < "$dump"

  run_as_app git -C "$APP_DIR" worktree add --quiet --detach "$REHEARSAL_DIR" "$ops_commit"
  install_requirements "$REHEARSAL_VENV" "$REHEARSAL_DIR"
  run_migration "$REHEARSAL_VENV" "$REHEARSAL_DIR" "$REHEARSAL_DB"

  echo "== 事前リハーサルに成功した"
}

apply_update() {
  local ops_commit="$1"

  echo "== コードを取得"
  run_as_app git -C "$APP_DIR" merge --ff-only --quiet "$ops_commit"

  echo "== rootで実行するスクリプトとsystemdの設定を更新"
  install_ops_files "$SCRIPT_DIR"

  echo "== 依存パッケージ"
  install_requirements "$VENV" "$APP_DIR"

  echo "== マイグレーション"
  run_migration "$VENV" "$APP_DIR" "$DB_NAME"

  echo "== 起動"
  systemctl enable --now shift-management

  # /healthはDBへの接続も確認する
  if ! wait_for_app -fsS "$APP_URL/health"; then
    echo "起動を確認できない" >&2
    return 1
  fi
  echo "== 起動を確認した"
}

# alembic downgradeは普段実行しないため使わず、デプロイ前のバックアップから復元する
roll_back() {
  local prev_commit="$1"
  local had_schema="$2"
  local backup_file="$3"

  systemctl stop shift-management

  echo "== コードと依存パッケージを戻す"
  run_as_app git -C "$APP_DIR" reset --hard --quiet "$prev_commit"
  install_requirements "$VENV" "$APP_DIR"

  if ! $had_schema; then
    echo "初回のデプロイで戻す先のDBがないため、DBは復元しない。アプリは停止したままにする" >&2
    return 1
  fi

  echo "== デプロイ前のバックアップからDBを復元"
  # 復元はバックアップにあるテーブルだけを作り直す。新しいマイグレーションが追加したテーブルなどが
  # 残らないよう、アプリのDBユーザーが持つものを先にすべて消す
  sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "DROP OWNED BY $DB_USER"

  # 復元後、スキーマのバージョンがコードと一致することを確認できたときだけアプリを起動する。
  # このスクリプトと同じコミットのrestore-db.shを使うため、管理用のチェックアウトから実行する
  bash "$SCRIPT_DIR/restore-db.sh" --yes "$backup_file"

  # 戻した先のコードに/healthがあるとは限らないため、応答があるかだけを見る
  if ! wait_for_app -sS "$APP_URL/"; then
    echo "戻したあとの起動を確認できない" >&2
    return 1
  fi
}

main "$@"; exit $?
