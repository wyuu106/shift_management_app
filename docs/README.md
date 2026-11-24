# ドキュメント一覧

シフト管理アプリの要件と設計の文書をまとめる。

## 文書

| 文書 | 内容 |
| --- | --- |
| [requirements/README.md](./requirements/README.md) | 目的、利用者、共通機能（登録申請・ログイン・権限）、非機能要件、環境変数、対象外 |
| [requirements/admin.md](./requirements/admin.md) | 管理者の画面と操作 |
| [requirements/staff.md](./requirements/staff.md) | スタッフの画面と操作 |
| [requirements/period.md](./requirements/period.md) | シフト期間のルール（重複時の上書き、画面ごとの表示期間、期間選択） |
| [requirements/ui.md](./requirements/ui.md) | 画面の構成、表示内容、ダイアログ |
| [requirements/api.md](./requirements/api.md) | API一覧、対象期間の指定、同時編集の検出 |
| [requirements/data.md](./requirements/data.md) | テーブルと制約 |
| [architecture/directory-structure.md](./architecture/directory-structure.md) | ディレクトリ構成と各ファイルの責務、依存方向 |
| [infrastructure/architecture.md](./infrastructure/architecture.md) | 本番環境（AWS Lightsail）の構成と、そう決めた理由 |
| [infrastructure/deploy-flow.md](./infrastructure/deploy-flow.md) | 初回デプロイで行った操作の流れと、つまずいた点 |
| [review.md](./review.md) | 過去のコードレビューと修正の記録 |

本番環境の構築・運用の手順は`infra/README.md`にある。

## 目的別の読み方

| やりたいこと | 読む文書 |
| --- | --- |
| アプリの全体像を知る | `requirements/README.md` |
| 管理者の画面を変更する | `requirements/admin.md`、`requirements/ui.md` |
| スタッフの画面を変更する | `requirements/staff.md`、`requirements/ui.md` |
| シフト期間に関わる処理を変更する | `requirements/period.md` |
| APIを追加・変更する | `requirements/api.md`、`requirements/data.md` |
| テーブルを変更する | `requirements/data.md` |
| ファイルの置き場所を決める | `architecture/directory-structure.md` |
| 本番環境を変更する | `infrastructure/architecture.md`、`infra/README.md` |
| 本番環境を一から構築する | `infrastructure/deploy-flow.md`、`infra/README.md` |

## 書き方の決まり

- 1つのルールは1か所にだけ書く。他の文書からはリンクで参照する。
  - シフト期間のルールは`requirements/period.md`
  - APIの入出力は`requirements/api.md`
  - 画面の見た目と文言は`requirements/ui.md`
- 決まっているが実装していない項目には「未実装」と書く。実装したら表記を消す。
- 日付はAPI・DBでは`YYYY-MM-DD`、画面では日本語形式で書く。
