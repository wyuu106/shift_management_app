# infra

シフト管理APIをAWS Lightsailで動かすためのCDKアプリとサーバー用スクリプト。
構成と設計の理由は`docs/infrastructure/architecture.md`を参照。

```text
infra/
├── bin/infra.ts                  CDKアプリの入口
├── lib/config.ts                 リージョン・インスタンスなどの設定値
├── lib/shift-management-stack.ts インスタンス、静的IP、ファイアウォール、バケット、アラーム
├── scripts/safe-deploy.sh        置き換え・削除がないことを確認してから適用するデプロイ
├── scripts/check-change-set.ts   変更セットの判定
├── test/                         スタックと判定処理のテスト
└── server/                       サーバー内で実行するスクリプトと設定
    ├── setup.sh                  swap、パッケージ、ufw、ユーザー、systemd、Nginx
    ├── setup-db.sh               DB・DBユーザー・環境変数ファイルの作成
    ├── deploy.sh                 アプリの更新（事前リハーサル、マイグレーション、失敗時の自動ロールバック）
    ├── backup-db.sh              DBバックアップ
    ├── restore-db.sh             DB復旧
    ├── backup-status.sh          バックアップの状態確認・失敗の記録
    ├── server-check.sh           ディスクの空きと証明書の期限の確認
    ├── ping-monitor.sh           外部の監視サービスへ正常終了の合図を送る
    ├── backup.env.example        バックアップ用の環境変数の雛形
    ├── monitor.env.example       監視サービスの合図先URLの雛形
    ├── lib/ops.sh                setup.sh・deploy.sh共通の確認と配置処理
    ├── systemd/                  API常駐、バックアップと状態確認のタイマー、失敗時の記録
    ├── motd/                     SSHログイン時のバックアップ・ディスク・証明書の異常表示
    └── nginx/                    リバースプロキシ設定、ログインの回数制限
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
aws sts get-caller-identity --profile yumeri
aws lightsail get-regions --include-availability-zones --profile yumeri --region ap-southeast-2
aws lightsail get-bundles --profile yumeri --region ap-southeast-2 \
  --query "bundles[?bundleId=='micro_3_2']"
aws lightsail get-bucket-bundles --profile yumeri --region ap-southeast-2
```

SSHキーペアを使う場合は、Lightsailコンソールで作成するか公開鍵をインポートし、その名前を**初回デプロイ前に**`lib/config.ts`の`keyPairName`へ書く。
指定しない場合はリージョンのデフォルトキーペアを使う。作成後に変えるとインスタンスが作り直されるため、あとから変更しない。

### アラームの通知先

スタックにはインスタンスの異常とCPUの高負荷を知らせるアラームが含まれる。通知先のメールアドレスはCloudFormationで作れないため、**デプロイ前に**登録する。

```bash
aws lightsail create-contact-method \
  --protocol Email --contact-endpoint <メールアドレス> \
  --profile yumeri --region ap-southeast-2
# 届いた確認メールのリンクを開いてから、状態がValidになったことを確認する
aws lightsail get-contact-methods --profile yumeri --region ap-southeast-2
```

通知先を登録せずにデプロイした場合にアラームの作成が失敗するかどうかは確認していない。

### 差分確認とデプロイ

`cdk deploy`は直接使わず、`scripts/safe-deploy.sh`で適用する。

```bash
npx cdk diff --profile yumeri -c adminCidr=<自宅のIP>/32   # 差分を目で確認
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
# ~/shift-management-app は管理用のチェックアウト。rootで動かすスクリプトとsystemdの設定はここから取り込む
# sudoで起動するのは必ずこのチェックアウトのスクリプト。ホームは他のユーザーが書き込めない状態（標準は750）のままにする
# /opt/shift-management/app はアプリ用のチェックアウト（shiftappが所有し、アプリのコードだけに使う）
git clone <リポジトリURL> ~/shift-management-app
sudo bash ~/shift-management-app/infra/server/setup.sh
sudo -u shiftapp git -C /opt/shift-management clone <リポジトリURL> app

sudo bash ~/shift-management-app/infra/server/setup-db.sh
sudo nano /etc/shift-management/backend.env   # ALLOW_ORIGINSをVercelのURLにする
sudo nano /etc/nginx/sites-available/shift-management   # server_nameをドメインにする
sudo nginx -t && sudo systemctl reload nginx
```

## 4. アプリの起動と初期管理者

```bash
# 依存導入、alembic upgrade head、起動、起動確認まで行う（動作の詳細は9章）
sudo bash ~/shift-management-app/infra/server/deploy.sh

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
  --profile yumeri --region ap-southeast-2
```

```bash
# サーバーで設定する
sudo install -m 600 ~/shift-management-app/infra/server/backup.env.example /etc/shift-management/backup.env
sudo nano /etc/shift-management/backup.env

sudo bash /usr/local/lib/shift-management/backup-db.sh   # 手動で1回試す
sudo systemctl enable --now shift-management-backup.timer
sudo bash /usr/local/lib/shift-management/backup-status.sh   # 状態OKになることを確認
```

### 失敗の検知とログ

- バックアップが失敗すると、systemdが`shift-management-backup-failure.service`を起動し、失敗日時を記録してシステムログにエラーを出す。
- 最後に外部保存できてから26時間以上たっている場合も異常とする（タイマー自体が動いていないケースを見つけるため）。
- 異常があると、SSHでログインしたときに警告が表示される。
- ログはディスクに保存されるので、再起動後も確認できる。

```bash
sudo bash /usr/local/lib/shift-management/backup-status.sh   # 状態、次回実行、直近のログ
journalctl -u shift-management-backup -n 50                  # バックアップのログ
journalctl -t shift-management-backup -p err                  # 失敗の記録だけ
```

## 7. 監視と通知

異常をメールで受け取るための設定。無料の範囲で使えるサービスを選ぶ（プランの内容と商用利用の可否は事前に確認する）。

| 検知したいこと | 仕組み | 設定する場所 |
| --- | --- | --- |
| インスタンスの異常、CPUの高負荷 | Lightsailのアラーム | CDK（2章でデプロイ済み） |
| APIが応答しない | 外部の死活監視サービスが`/health`を定期的に確認する | 監視サービス |
| バックアップが動いていない・失敗した | 成功時に合図を送り、来なければ通知される | 監視サービスと`monitor.env` |
| ディスクの空きが少ない、証明書の期限が近い | 毎日確認し、正常なら合図を送る | 監視サービスと`monitor.env` |

### APIの死活監視

外部の死活監視サービスに`https://api.<ドメイン>/health`を登録する。`/health`は認証なしで`{"status":"ok"}`を返し、DBに接続できないときは503を返す。

### 合図が来なければ通知する監視

監視サービスで「一定時間合図が来なければ通知する」監視を2つ作り、発行されたURLをサーバーに設定する。

```bash
sudo install -m 600 ~/shift-management-app/infra/server/monitor.env.example /etc/shift-management/monitor.env
sudo nano /etc/shift-management/monitor.env

sudo bash /usr/local/lib/shift-management/server-check.sh   # 手動で1回試す（OKなら合図も送る）
sudo systemctl enable --now shift-management-server-check.timer
```

- `PING_URL_BACKUP`: 毎日03:00のバックアップが外部保存まで成功したときに送る。
- `PING_URL_SERVER_CHECK`: 毎日09:00の確認で、ディスクの使用率が80%未満、かつ証明書の期限まで14日以上あるときに送る。
- URLが空のままなら合図は送らない。合図を送れなくてもバックアップ自体は失敗扱いにしない。
- 異常はSSHログイン時にも表示される。

```bash
journalctl -u shift-management-server-check -n 30   # 確認のログ
```

## 8. 復旧の練習

本番運用を始める前に一度試す。

```bash
sudo bash -c 'source /etc/shift-management/backup.env && aws s3 ls "s3://$BACKUP_BUCKET/db/"'

sudo bash /usr/local/lib/shift-management/restore-db.sh \
  "s3://shift-management-backup-<アカウントID>/db/<ファイル名>"
```

- 復元は1トランザクションで行うため、失敗したらDBは復元前の状態に戻る。
- 復元の成否にかかわらず、スキーマのバージョン（`alembic_version`）がコードと一致し、全テーブルを読めることを確認できたときだけアプリを起動する。
- 確認できなければアプリは停止したまま、エラーを表示して終了する。古いバックアップを戻した場合は`alembic upgrade head`を実行してから`sudo systemctl start shift-management`で起動する。

復旧後、画面でログインとシフト表示を確認する。

## 9. 日常の更新

```bash
git -C ~/shift-management-app pull --ff-only
sudo bash ~/shift-management-app/infra/server/deploy.sh
journalctl -u shift-management -n 50   # ログ確認
```

デプロイ中は数十秒ほどAPIが止まる。利用者の少ない時間帯に実行する。

`deploy.sh`は次の順で動く。

1. 管理用とアプリ用のチェックアウトの状態を確認する。
2. 事前リハーサル: バックアップを一時DB（`shift_management_rehearsal`）へ復元し、新しいコードのマイグレーションを試す。失敗したら本番は何も変更せずに中止する。
3. アプリを止めてバックアップを取る。
4. アプリ用のチェックアウトを管理用と同じコミットにそろえる。管理用のチェックアウトから`backup-db.sh`などを`/usr/local/lib/shift-management`へ、systemdの設定を`/etc/systemd/system`へ配置し直す。依存パッケージの更新、マイグレーション、起動、`/health`での起動確認を行う。
5. 4のどこかで失敗したら、コードと依存パッケージを元のコミットへ戻し、3のバックアップからDBを復元して起動する。

- 事前リハーサルは、本番とは別の作業ツリー（`/opt/shift-management/rehearsal`）とvenv（`/opt/shift-management/venv-rehearsal`）で行う。作業ツリーと一時DBは終了時に削除する。
- 自動で戻すのはアプリのコード、依存パッケージ、DBだけ。4で配置し直したスクリプトとsystemdの設定、管理用のチェックアウトは新しいままになる。原因を直して再度デプロイするか、管理用のチェックアウトを前のコミットへ戻して`deploy.sh`を実行する。
- 戻すときに`alembic downgrade`は使わない。
- 初回のデプロイで失敗した場合は、戻す先のDBがないためアプリは停止したままになる。
- 自動で戻せなかった場合は、表示されたバックアップのパスを使って8章の手順で復旧する。

### rootで動かすスクリプトの置き場

- バックアップのタイマー、失敗の記録、SSHログイン時の表示、復旧は、`/usr/local/lib/shift-management`に配置したスクリプトをrootで実行する。ディレクトリと親ディレクトリはrootだけが書き換えられる。
- `setup.sh`、`setup-db.sh`、`deploy.sh`は、管理用のチェックアウト（`~/shift-management-app`）から実行する。`/usr/local/lib/shift-management`への配置もここから行う。
- `/opt/shift-management/app`はshiftapp（APIの実行ユーザー）が書き換えられるため、ここにあるスクリプトをsudoで直接実行しない。APIが乗っ取られたときにroot権限まで奪われるのを防ぐため。
- `sudo`で起動したスクリプトはその時点でrootとして読み込まれるため、安全かどうかは「どのパスを起動するか」で決まる。`setup.sh`・`setup-db.sh`・`deploy.sh`は必ず`~/shift-management-app/infra/server/`から起動する。
- `setup.sh`と`deploy.sh`は、共通処理の`lib/ops.sh`を読み込む前に、起動したスクリプトと`lib/ops.sh`のパスを`/`までさかのぼって確認する。途中のシンボリックリンクは参照先もたどる。shiftappが所有している、または書き込めるものがあれば、`lib/ops.sh`を読み込まずに中止する。
- 読み込んだあとは、管理用のチェックアウト全体（`.git`を含む）をshiftappが書き換えられる場合も中止する。
- `deploy.sh`は、管理用のチェックアウトにコミットされていない変更がある場合や、アプリ用のチェックアウトを同じコミットへ進められない場合は、何も変更せずに中止する。

## 10. 鍵が漏えいした疑いがあるとき

鍵は定期的には交換しない。漏えいが疑われるときに次の手順で交換する。

### バケットのアクセスキー

```bash
# 手元のPCで新しいキーを発行する（1つのバケットに持てるキーは2つまで）
aws lightsail create-bucket-access-key \
  --bucket-name shift-management-backup-<アカウントID> \
  --profile yumeri --region ap-southeast-2
```

```bash
# サーバーで新しいキーに差し替え、バックアップが成功することを確認する
sudo nano /etc/shift-management/backup.env
sudo bash /usr/local/lib/shift-management/backup-db.sh
```

```bash
# 手元のPCで古いキーを削除する
aws lightsail get-bucket-access-keys \
  --bucket-name shift-management-backup-<アカウントID> \
  --profile yumeri --region ap-southeast-2
aws lightsail delete-bucket-access-key \
  --bucket-name shift-management-backup-<アカウントID> \
  --access-key-id <古いキーのID> \
  --profile yumeri --region ap-southeast-2
```

### `SECRET_KEY`

変更すると発行済みのトークンがすべて無効になり、全員が再ログインになる。

```bash
openssl rand -hex 32   # 表示された値をSECRET_KEYに設定する
sudo nano /etc/shift-management/backend.env
sudo systemctl restart shift-management
```

## 11. Railwayの停止

新環境で以下を確認してからRailwayを削除する。

- ログイン、登録申請と承認、期間設定、希望提出、シフト登録・確認
- ログインを続けて失敗させると、回数制限のメッセージが表示されること
- `https://api.<ドメイン>/docs`が404になること、`/health`が応答すること
- 定期バックアップがバケットに保存されていること
- 復旧の練習が成功したこと
- デプロイの自動ロールバックが動くこと（わざと起動に失敗するコミットで試す）
- 監視サービスからの通知が届くこと（合図を止めて試す）

## ローカル開発のDB

`/docs`を使う場合は、`backend/.env`に`ENABLE_API_DOCS=true`を書く。未設定なら`/docs`・`/redoc`・`/openapi.json`は404になる。

起動時にテーブルを作らなくなったため、ローカルでもAlembicを使う。

```bash
cd backend
alembic upgrade head          # 空のDB
alembic stamp head            # すでに最新のテーブルがあるDB（構造が一致している場合のみ）
alembic revision --autogenerate -m "変更内容"   # モデル変更後。生成内容は必ず確認する
```
