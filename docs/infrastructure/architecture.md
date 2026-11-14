# インフラ設計

バックエンドをRailwayからAWS Lightsailへ移行する。フロントエンドは引き続きVercelで配信する。

構築・運用の手順は`infra/README.md`にまとめる。この文書には構成と、そう決めた理由を書く。

## 1. 構成

```text
スマートフォン
  │ HTTPS
  ├──────────────▶ Vercel（React）
  │
  │ HTTPS（api.<ドメイン>）
  ▼
Lightsailインスタンス shift-management-server（Ubuntu 24.04）
  ├── Nginx :80 / :443 ── Let's Encrypt証明書、リバースプロキシ
  │     ▼
  ├── FastAPI（uvicorn） 127.0.0.1:8000 ── systemdで常駐
  │     ▼
  └── PostgreSQL         localhost:5432
        │ 毎日03:00（日本時間）pg_dump
        ▼
Lightsailオブジェクトストレージ shift-management-backup-<アカウントID>
```

| 項目 | 値 |
| --- | --- |
| リージョン | `ap-southeast-2`（シドニー） |
| アベイラビリティーゾーン | `ap-southeast-2a` |
| AWS CLIプロファイル | `restaurant` |
| CDKスタック | `ShiftManagementStack` |
| インスタンス | `shift-management-server` / `ubuntu_24_04` / `small_3_2`（2GB RAM） |
| 静的IP | `shift-management-ip` |
| バックアップ先 | Lightsailバケット `shift-management-backup-<アカウントID>`（`small_1_0`） |
| DB | `shift_management`、接続ユーザー`shift_app` |

設定値は`infra/lib/config.ts`で管理する。SSHキーペア名のように変えるとインスタンスが作り直される値は、付け忘れで変わらないよう`config.ts`に固定する。変わりやすい管理者IPだけはコミットせず、デプロイ時に引数で渡す。

## 2. 決定事項と理由

### Lightsailインスタンス1台にAPIとDBを同居させる

- 店舗1つ・利用者数十人の規模なので、性能より月額費用と運用の単純さを優先する。
- EC2＋RDSにすると、VPCやセキュリティグループの設計が増え、費用も月数十ドルになる。
- 代わりに「インスタンスが壊れるとDBも失う」というリスクを負う。これは外部バックアップで補う（4章）。
- 将来DBを分ける場合は、Lightsailのマネージドデータベース（月15ドル程度から）に移す。

### CDK（TypeScript）でAWSリソースを管理する

- Lightsailのインスタンス、静的IP、ファイアウォール、バケットをコードで管理し、設定の履歴をGitに残す。
- LightsailにはCDKの高レベルな部品がないため、CloudFormationの定義をそのまま書くL1コンストラクト（`CfnInstance`など）を使う。
- アセット（Lambdaのコードなど）を使わないため、`LegacyStackSynthesizer`を使う。これで`cdk bootstrap`（CDK用のS3バケットやIAMロールの事前作成）が不要になる。

### サーバー内部の設定はCDKではなくスクリプトで行う

- Lightsailのインスタンスは、起動スクリプト（UserData）を変更するとCloudFormationが作り直す。作り直すと中のDBが消える。
- そのため、パッケージの導入やDB作成は`infra/server/`のシェルスクリプトをSSHで実行する。スクリプトは何度実行しても同じ結果になるように書く。

### DBスキーマはAlembicで管理する

- 起動時の`Base.metadata.create_all()`は廃止した。`create_all()`は既存テーブルの変更を反映できず、スキーマの管理元が2つになるため。
- 新環境のDBは`alembic upgrade head`で初期マイグレーション（`backend/alembic/versions/0001_initial_schema.py`）から作る。
- 以降のスキーマ変更はマイグレーションファイルを追加して行う。デプロイ時は`infra/server/deploy.sh`がバックアップを取ってから適用する。

### 初期管理者はサーバー上のコマンドで作成する

- `python -m scripts.create_admin --id <ID> --name <名前>`で作成する。パスワードは対話入力で、引数・環境変数・ログに平文を残さない。
- 管理者がすでにいる場合は作成しない。
- 以前の`POST /init`（認証なしで管理者を作るAPI）は廃止した。公開されたAPIで管理者を作れる状態を残さないため。

### 既存データは引き継がない

- RailwayのDBデータは破棄してよいと判断した。`pg_dump`/`pg_restore`による移行はしない。
- Lightsail上に空のDBを作り、初期管理者から登録し直す。
- `backend/scripts/migrate_review.py`は既存DB向けの移行スクリプトのため、新環境では使わない。
- Railway環境は、新環境の動作確認が完了するまで削除しない。

## 3. ネットワークとセキュリティ

### 公開ポート

| ポート | 許可元 | 用途 |
| --- | --- | --- |
| 22 | 管理者IP、`lightsail-connect` | SSH |
| 80 | すべて | Let's Encryptの証明書発行、HTTPSへのリダイレクト |
| 443 | すべて | API |

- 8000（FastAPI）と5432（PostgreSQL）は公開しない。入口をNginxだけにし、アプリとDBに直接アクセスされないようにする。
- さらにFastAPIは`127.0.0.1`、PostgreSQLは`localhost`だけで待ち受ける。ファイアウォールの設定を誤っても外から届かない。
- サーバー内でもufw（Ubuntuのファイアウォール）で22・80・443だけを許可し、二重に制限する。
- `lightsail-connect`はLightsailコンソールのブラウザSSHの接続元。自宅のIPが変わってSSHで入れなくなっても、ブラウザから入れるように許可しておく。
- 管理者IPを指定しない場合、SSHはブラウザSSHだけになる。

### HTTPS

- Vercel（HTTPS）からHTTPのAPIを呼ぶとブラウザが通信を止める（mixed content）。そのため独自ドメインとHTTPSは必須。
- 独自ドメインの`api.<ドメイン>`のAレコードに静的IPを設定し、`certbot --nginx`で証明書を発行する。証明書はcertbotが自動更新する。

### 機密情報

| ファイル | 中身 | 権限 |
| --- | --- | --- |
| `/etc/shift-management/backend.env` | `DATABASE_URL`、`SECRET_KEY`、`ALLOW_ORIGINS` | `root:shiftapp` 640 |
| `/etc/shift-management/backup.env` | バケットのアクセスキー、バケット名 | `root:root` 600 |

- DBパスワードと`SECRET_KEY`は`infra/server/setup-db.sh`がサーバー上で生成する。手元のPCやGitには置かない。
- `ALLOW_ORIGINS`にはVercelの本番URLを設定する。

### OS

- `unattended-upgrades`でセキュリティ更新を自動適用する。
- FastAPIは専用ユーザー`shiftapp`で動かし、rootでは動かさない。

## 4. バックアップと復旧

| 種類 | タイミング | 保存先 | 保持期間 |
| --- | --- | --- | --- |
| 定期バックアップ | 毎日03:00（日本時間） | サーバー内＋Lightsailバケット | サーバー内7日、バケット30日 |
| デプロイ前バックアップ | `deploy.sh`実行時 | サーバー内 | 7日 |
| 復旧前バックアップ | `restore-db.sh`実行時 | サーバー内 | 7日 |

- `pg_dump`のcustom形式で保存する。DB単位で戻せる。
- バケットはインスタンスと別のリソースなので、インスタンスが壊れても残る。
- 復旧は`infra/server/restore-db.sh`で行う。アプリを止め、1トランザクションで復元し、失敗したら元に戻す。
- 復元の成否にかかわらず、DBの正常性（スキーマのバージョンがコードと一致し、全テーブルを読めること）を確認できたときだけアプリを起動する。確認できなければ停止したままエラーで終了する。壊れたDBのままアプリを動かして、データの不整合を広げないため。

### 失敗の検知

- バックアップが失敗すると、systemdの`OnFailure`で記録用のユニットが動き、失敗日時を記録してシステムログにエラーを出す。
- 最後に外部保存できてから26時間以上たっている場合も異常とする。タイマー自体が止まっている場合など、「失敗すらしていない」状態を見つけるため。
- 異常はSSHログイン時に表示し、`infra/server/backup-status.sh`で状態と直近のログを確認できる。
- journald（systemdのログ）はディスクに保存し、再起動後もログを確認できるようにする。
- メールやSlackへの通知はまだない。ログインしないと気づけないため、運用が安定したら追加を検討する。
- 本番運用を始める前と、その後も定期的に、実際に復旧できるか試す。手順は`infra/README.md`にある。
- Lightsailの自動スナップショット（インスタンス丸ごとの保存）は使わない。費用がかかり、戻すときもインスタンス単位になるため。

## 5. 費用

| リソース | 月額 | 備考 |
| --- | --- | --- |
| インスタンス `small_3_2` | 約12ドル | データ転送量の無料枠を含む |
| 静的IP | 0ドル | インスタンスに付けている間は無料。外したままにすると課金される |
| バケット `small_1_0` | 約1ドル | 5GBまで |
| ドメイン | 取得先による | 年額 |

- 金額は2026年11月時点の想定で、AWSの料金ページでは確認していない。デプロイ前に確認する。
- `cdk bootstrap`をしないため、CDK用のS3バケットなどは作られない。
- 手動スナップショットを作った場合は、容量に応じて別途課金される。

## 6. 既知のリスクと対策

| リスク | 対策 |
| --- | --- |
| インスタンスが作り直されるとDBが消える | `bundleId`・`blueprintId`・`keyPairName`・UserDataを変えない。デプロイは`infra/scripts/safe-deploy.sh`で行い、変更セットに置き換えか削除があれば自動で中止する。インスタンスには`RETAIN`（スタック削除時も残す）を設定 |
| インスタンス障害でDBを失う | 毎日バケットへバックアップし、復旧手順を試しておく |
| バックアップの失敗に気づかない | 失敗と26時間以上の未実行を記録し、SSHログイン時に警告する |
| スタックを誤って削除する | スタックの削除保護（termination protection）を有効にする |
| SSHに入れなくなる | ブラウザSSH（`lightsail-connect`）を常に許可する |
| ディスクがいっぱいになる | サーバー内のバックアップは7日で削除する。容量はLightsailコンソールのメトリクスで確認する |

## 7. 前提と未決事項

- `ap-southeast-2`でLightsailを使えること、`small_3_2`と`small_1_0`が存在することはまだ確認していない。デプロイ前に`aws lightsail get-bundles`と`aws lightsail get-bucket-bundles`で確認する。
- APIに使う独自ドメインは未定。決まるまで本番切り替えはできない。
- 学習用の`default`プロファイルと既存のEC2・RDS・VPCは使わない。CDKは必ず`--profile restaurant`で実行する。
- 組織のSCP（AWS Organizationsのアクセス制限）で操作が拒否される場合は、拒否されたアクションを確認してから対応を決める。
