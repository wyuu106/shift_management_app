# コードレビューと修正結果

対象：既存コードベース全体のレビュー項目1〜10。Criticalの指摘なし。

| No. | 重要度 | 問題 | 修正結果 |
| --- | --- | --- | --- |
| 1 | High | 古い画面の保存で更新が失われる | 確定シフトは期間単位、希望は本人・期間単位でバージョンを管理。`expected_version`不一致は409。編集内容を保持し、確認後に再読み込みする。 |
| 2 | Medium | 削除前のJWTが同じIDの新ユーザーで使える | アカウント作成ごとに異なる`auth_id`をJWTとDBで照合。識別子のない旧JWTも拒否する。 |
| 3 | Medium | 申請の承認・却下が競合する | 両操作で行ロック後に`pending`を確認し、処理中のボタンも無効化する。 |
| 4 | Medium | 重複確認の500・重複申請 | 存在確認を複数件に対応。未処理申請のID・名前を部分一意インデックスで保護し、競合時は409とロールバックで処理する。 |
| 5 | Medium | 不正なユーザーIDを受け付ける | 新規IDを半角英数字・`-`・`_`、1〜64文字に制限。画面とAPIで検証し、削除URLもエンコードする。 |
| 6 | Medium | 保存中の追加編集を保存済み扱いにする | 保存中は編集・希望反映を含む操作を`fieldset disabled`で無効化する。 |
| 7 | Medium | 配列・オブジェクトのAPIエラーで画面が落ちる | `getErrorMessage`で必ず文字列へ整形する。 |
| 8 | Medium | DB・認証・画面テスト不足 | 独立PostgreSQLで競合・外部キー・移行・ロールバック、実JWTで認証、Playwrightで画面操作を検証する。 |
| 9 | Low | モーダルから背後へフォーカスが移る | 共通`Modal`で`showModal()`、Tab循環、Escape、フォーカス復帰を実装する。 |
| 10 | Low | 開発スキルに旧仕様が残る | 複数期間保持、重複対象のみ置換、希望削除・確定保持へ更新。保存競合・認証・モーダルの注意点も追記する。 |

期間設定・希望登録・確定シフト登録は、削除／挿入／バージョン更新を同一トランザクションで行い、途中の例外ではすべてロールバックする。

## 検証

- バックエンド：SQLite 15件、独立PostgreSQL 21件。認証・競合・データ保持・移行・ロールバックを検証。
- フロント：エラー整形の単体テスト、画面テスト（320px／1280px）。保存中の操作禁止、競合時の編集保持、期間切り替えのキャンセル、モーダル操作、422表示を検証。
- lint・build・Python構文・差分チェックを実施。
- UIテストはAPIをモックし、実JWT・DB操作はバックエンドで別途検証する。Browser pluginが利用できないためPlaywrightを使用。

```bash
cd backend
conda run -n devenv python -B -m unittest discover -s tests -v
# PostgreSQL検証は、既存運用DBとは別のDBをTEST_DATABASE_URLで明示する。
# テストが作ったreview_test_<UUID>スキーマだけを終了時に削除する。
```

```bash
cd frontend
npm test
npm run lint
npm run build
# 初回のみ：npx playwright install chromium
# 別ターミナルでnpm run dev -- --host 127.0.0.1を起動してから実行する。
npm run test:e2e
```

## 既存DBへの適用

既存運用DBへの移行は未実行。新コードを稼働させる前にバックアップを取得し、アプリを停止して以下を実行する。`create_all()`だけでは既存カラムは追加されない。

```bash
cd backend
# DATABASE_URLの接続先を確認する。既定は確認のみ（型・件数・申請の重複）。
conda run -n devenv python -m scripts.migrate_review
# 確認したDBへ一括適用する。
conda run -n devenv python -m scripts.migrate_review --apply
```

- 追加：`users.auth_id`、`shift_periods.shift_version`、`shift_request_versions`、未処理申請の部分一意インデックス。
- 既存ユーザーの認証識別子を補完し、業務データは削除しない。既存の不正なIDも自動変更しない。
- 未処理申請に重複がある場合は中止する。対象を確認して手動整理後に再実行する。
- 移行中の失敗はDDL・補完を含めてロールバックする。成功後も再実行できる。
- 適用後は全ユーザーの再ログインが必要。フロント・バックエンドを同時更新する。保存APIの`expected_version`が必須になる。
- 適用後に戻す場合はアプリを停止し、バックアップを別DBへ復元・検証して旧コードと合わせて切り替える。稼働中に新しい列を削除しない。

依存インストール時にnpm auditが既存依存を含む警告を出している。今回の項目1〜10とは別件で、依存更新や本番環境への攻撃検証は実施していない。
