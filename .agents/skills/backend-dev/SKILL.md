---
name: backend-dev
description: FastAPI製シフト管理APIのrouter、CRUD、Pydantic schema、JWT認証、権限制御を実装・修正する際に使う。
---

# Backend Development

## 参照先

- API・共通要件: `docs/requirements/README.md`
- 管理者要件: `docs/requirements/admin.md`
- スタッフ要件: `docs/requirements/staff.md`
- 構成: `docs/architecture/directory-structure.md`

## 層ごとの責務

- `routers/`: エンドポイント、依存注入、response model、権限確認
- `cruds/`: DB問い合わせ、業務ルール、一括更新、commit・rollback
- `schemas/`: リクエストとレスポンスのPydantic型
- `models/`: SQLAlchemyテーブル・外部キー・relationship
- `utils/auth.py`: パスワード、JWT、現在ユーザー
- `utils/period_util.py`: 現在期間の共通取得

routerへ複雑なSQLや一括更新ロジックを置かず、CRUDへ委譲する。

## 認証・認可

- 公開APIは`/init`、`/register/request`、`/login`。
- それ以外は原則`get_current_user`を依存注入する。
- 管理者専用APIでは`current_user.role == "admin"`を検証し、不一致は403にする。
- JWTのsubjectには文字列のユーザーIDを入れ、有効期限は現行の6時間を維持する。
- パスワードは`hash_password`を通して保存し、平文を返却・ログ出力しない。

## データ契約

- `users.id`とシフト関連の`user_id`は`str`。PydanticとSQLAlchemyの両方で一致させる。
- 日付は`datetime.date`を使う。
- nullableなDB項目はPydanticでも`| None`を付ける。
- routerの`response_model`とCRUDの実際の返却値を一致させる。
- エラーは`HTTPException`の`detail`へ日本語メッセージを設定する。

## 現行の更新方式

- 期間登録: 既存の営業日と期間を全削除して1件を登録する。
- 希望登録: 現在期間内にあるログインユーザーの希望を削除して一括登録する。
- シフト登録: 現在期間内の確定シフトを削除して一括登録する。

この置換方式を部分更新へ変えることは要件変更になるため、明示的な依頼なしに変更しない。

## トランザクション

- 複数行を変更する処理は1トランザクションとして扱う。
- 成功時に`commit`する。
- 例外時は`rollback`してから例外を返す。
- 元の`HTTPException`を一般的な500へ上書きしないよう、例外処理を変更する場合はステータス維持を確認する。

## API変更時の確認

1. router、schema、CRUD、modelの影響範囲を確認する。
2. 対応するフロントページの送受信形式を確認する。
3. 公開／ログイン済み／管理者の権限を明示する。
4. 空データ、期間未設定、重複、対象なしを確認する。
5. 一括置換処理で対象期間外のデータを消さないことを確認する。

## 検証

```bash
python -m compileall backend/app
git diff --check
```

可能であればFastAPIを起動し、変更対象APIについて以下を確認する。

- 正常系のステータスとレスポンス
- トークンなしの401
- ロール違反の403
- 不正入力の400または422
- 対象なし・期間なしの404
- 更新失敗時にDBが中途半端な状態にならないこと
