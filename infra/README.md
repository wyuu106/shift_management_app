# infra

シフト管理APIをAWS Lightsailで動かすためのCDKアプリとサーバー用スクリプト。
構成と設計の理由は`docs/infrastructure/architecture.md`を参照。

```text
infra/
├── bin/infra.ts                  CDKアプリの入口
├── lib/config.ts                 リージョン・インスタンスなどの設定値
├── lib/shift-management-stack.ts インスタンス、静的IP、ファイアウォール、バケット
├── scripts/safe-deploy.sh        置き換え・削除がないことを確認してから適用するデプロイ
├── scripts/check-change-set.ts   変更セットの判定
├── test/                         スタックと判定処理のテスト
└── server/                       サーバー内で実行するスクリプトと設定
    ├── setup.sh                  パッケージ、ufw、ユーザー、systemd、Nginx
    ├── setup-db.sh               DB・DBユーザー・環境変数ファイルの作成
    ├── deploy.sh                 アプリの更新とマイグレーション
    ├── backup-db.sh              DBバックアップ
    ├── restore-db.sh             DB復旧
    ├── backup-status.sh          バックアップの状態確認・失敗の記録
    ├── backup.env.example        バックアップ用の環境変数の雛形
    ├── systemd/                  API常駐、バックアップのタイマーと失敗時の記録
    ├── motd/                     SSHログイン時のバックアップ異常表示
    └── nginx/                    リバースプロキシ設定
```

> AWSのリソースを作成・変更・削除するコマンド（`cdk deploy`、`cdk destroy`、`aws lightsail create-*`など）は、実行前に内容を確認してから行う。

## 1. CDKの検証

```bash
cd infra
npm ci
npm run build
npm test

# AWSに接続せずにテンプレートを生成する
npx cdk synth -c adminCidr=<自宅のIP>/32
```

## 2. AWSリソースの作成

### 事前確認

```bash
aws sts get-caller-identity --profile restaurant
aws lightsail get-regions --include-availability-zones --profile restaurant --region ap-southeast-2
aws lightsail get-bundles --profile restaurant --region ap-southeast-2 \
  --query "bundles[?bundleId=='small_3_2']"
aws lightsail get-bucket-bundles --profile restaurant --region ap-southeast-2
```

SSHキーペアを使う場合は、Lightsailコンソールで作成するか公開鍵をインポートし、その名前を**初回デプロイ前に**`lib/config.ts`の`keyPairName`へ書く。
指定しない場合はリージョンのデフォルトキーペアを使う。作成後に変えるとインスタンスが作り直されるため、あとから変更しない。

### 差分確認とデプロイ

`cdk deploy`は直接使わず、`scripts/safe-deploy.sh`で適用する。

```bash
npx cdk diff --profile restaurant -c adminCidr=<自宅のIP>/32   # 差分を目で確認
bash scripts/safe-deploy.sh <自宅のIP>/32
```

`safe-deploy.sh`は次の順で動く。

1. CloudFormationの変更セット（適用前に「何がどう変わるか」を計算したもの）を作る。この時点では何も変わらない。
2. 置き換え（`Replacement`が`True`または`Conditional`）か削除が1つでもあれば、変更セットを消して中止する。
3. 変更内容を表示し、`yes`と入力したときだけ適用する。

- `cdk bootstrap`は不要（`LegacyStackSynthesizer`を使っているため）。
- 中止された場合は、`lib/config.ts`の`bundleId`、`blueprintId`、`keyPairName`などを変えていないか確認する。インスタンスを作り直すとDBが消える。
- 出力の`StaticIpAddress`をDNSのAレコード（`api.<ドメイン>`）に設定する。
- 自宅のIPが変わったら、同じコマンドを新しいIPで実行する。

## 3. サーバーの初期設定

```bash
ssh ubuntu@<静的IP>

# リポジトリを取得する（非公開リポジトリならデプロイキーを登録しておく）
# setup.shを動かすために一度ホームへ取得し、アプリユーザー作成後に正式な場所へ取得し直す
git clone <リポジトリURL> ~/shift-management-app
sudo bash ~/shift-management-app/infra/server/setup.sh
sudo -u shiftapp git -C /opt/shift-management clone <リポジトリURL> app
rm -rf ~/shift-management-app

sudo bash /opt/shift-management/app/infra/server/setup-db.sh
sudo nano /etc/shift-management/backend.env   # ALLOW_ORIGINSをVercelのURLにする
sudo nano /etc/nginx/sites-available/shift-management   # server_nameをドメインにする
sudo nginx -t && sudo systemctl reload nginx
```

## 4. アプリの起動と初期管理者

```bash
# 依存導入、alembic upgrade head、起動、起動確認まで行う
sudo bash /opt/shift-management/app/infra/server/deploy.sh

# 初期管理者を作る（パスワードは対話入力）
# /opt/shift-management はshiftapp以外は入れないため、cdもshiftappとして行う
sudo -u shiftapp bash -c '
  set -a && source /etc/shift-management/backend.env && set +a
  cd /opt/shift-management/app/backend
  /opt/shift-management/venv/bin/python -m scripts.create_admin --id <ID> --name <名前>
'
```

## 5. HTTPS化

DNSが静的IPを向いてから実行する。

```bash
sudo certbot --nginx -d api.<ドメイン>
sudo certbot renew --dry-run   # 自動更新の確認
```

Vercelの環境変数`VITE_API_URL`を`https://api.<ドメイン>`に変更して再デプロイする。

## 6. バックアップの設定

```bash
# 手元のPCで、バケット用のアクセスキーを発行する（シークレットはこのときしか表示されない）
aws lightsail create-bucket-access-key \
  --bucket-name shift-management-backup-<アカウントID> \
  --profile restaurant --region ap-southeast-2
```

```bash
# サーバーで設定する
sudo install -m 600 /opt/shift-management/app/infra/server/backup.env.example /etc/shift-management/backup.env
sudo nano /etc/shift-management/backup.env

sudo bash /opt/shift-management/app/infra/server/backup-db.sh   # 手動で1回試す
sudo systemctl enable --now shift-management-backup.timer
sudo bash /opt/shift-management/app/infra/server/backup-status.sh   # 状態OKになることを確認
```

### 失敗の検知とログ

- バックアップが失敗すると、systemdが`shift-management-backup-failure.service`を起動し、失敗日時を記録してシステムログにエラーを出す。
- 最後に外部保存できてから26時間以上たっている場合も異常とする（タイマー自体が動いていないケースを見つけるため）。
- 異常があると、SSHでログインしたときに警告が表示される。
- ログはディスクに保存されるので、再起動後も確認できる。

```bash
sudo bash /opt/shift-management/app/infra/server/backup-status.sh   # 状態、次回実行、直近のログ
journalctl -u shift-management-backup -n 50                        # バックアップのログ
journalctl -t shift-management-backup -p err                        # 失敗の記録だけ
```

## 7. 復旧の練習

本番運用を始める前に一度試す。

```bash
sudo bash -c 'source /etc/shift-management/backup.env && aws s3 ls "s3://$BACKUP_BUCKET/db/"'

sudo bash /opt/shift-management/app/infra/server/restore-db.sh \
  "s3://shift-management-backup-<アカウントID>/db/<ファイル名>"
```

- 復元は1トランザクションで行うため、失敗したらDBは復元前の状態に戻る。
- 復元の成否にかかわらず、スキーマのバージョン（`alembic_version`）がコードと一致し、全テーブルを読めることを確認できたときだけアプリを起動する。
- 確認できなければアプリは停止したまま、エラーを表示して終了する。古いバックアップを戻した場合は`alembic upgrade head`を実行してから`sudo systemctl start shift-management`で起動する。

復旧後、画面でログインとシフト表示を確認する。

## 8. 日常の更新

```bash
sudo bash /opt/shift-management/app/infra/server/deploy.sh
journalctl -u shift-management -n 50   # ログ確認
```

## 9. Railwayの停止

新環境で以下を確認してからRailwayを削除する。

- ログイン、登録申請と承認、期間設定、希望提出、シフト登録・確認
- 定期バックアップがバケットに保存されていること
- 復旧の練習が成功したこと

## ローカル開発のDB

起動時にテーブルを作らなくなったため、ローカルでもAlembicを使う。

```bash
cd backend
alembic upgrade head          # 空のDB
alembic stamp head            # すでに最新のテーブルがあるDB（構造が一致している場合のみ）
alembic revision --autogenerate -m "変更内容"   # モデル変更後。生成内容は必ず確認する
```
