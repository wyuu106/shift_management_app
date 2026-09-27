---
name: database-dev
description: PostgreSQL・SQLAlchemyを使うシフト管理アプリのテーブル、外部キー、型、クエリ、データ移行を設計・修正する際に使う。
---

# Database Development

## 参照先

- データ要件: `docs/requirements/README.md`
- 構成: `docs/architecture/directory-structure.md`
- SQLAlchemyモデル: `backend/app/models/`
- DB操作: `backend/app/cruds/`

## 現行テーブル

### `users`

- `id`: String、主キー
- `name`: String、一意
- `hashed_password`: String
- `role`: String、デフォルト`staff`

### `user_requests`

- `id`: Integer、主キー
- `user_id`: String
- `name`: String
- `hashed_password`: String
- `status`: String、デフォルト`pending`

### `shift_periods`

- `id`: Integer、主キー
- `name`: nullable String
- `start`: Date
- `end`: Date

### `business_dates`

- `id`: Integer、主キー
- `business_date`: Date
- `period_id`: Integer、`shift_periods.id`への外部キー
- ORM relationshipで期間削除時にdelete-orphanを適用

### `shift_requests`

- `id`: Integer、主キー
- `shift_date`: Date
- `remark`: nullable String
- `user_id`: String、`users.id`への外部キー、`ON DELETE CASCADE`

### `shifts`

- `id`: Integer、主キー
- `shift_date`: Date
- `remark`: nullable String
- `user_id`: String、`users.id`への外部キー、`ON DELETE CASCADE`

## 必須の型整合性

- `users.id`は文字列IDであり、整数へ変更しない。
- `shift_requests.user_id`と`shifts.user_id`も必ずStringにする。
- Pydanticの`UserCreateResponse.id`、シフトschemaの`user_id`も`str`にする。
- 外部キー元と参照先のPostgreSQL型を一致させる。`INTEGER`と`VARCHAR`を混在させない。
- `date`と文字列をDB層で混在させず、SQLAlchemyでは`Date`を使う。

## 現行データモデルの前提

- アプリケーション上の現在期間は1件。
- 営業日は`business_dates`に存在する日、休業日は期間内で存在しない日。
- 希望と確定シフトは日付・ユーザー単位の行として保存する。
- 勤務時間専用カラムはなく、時間帯などは`remark`へ保存する。
- 登録申請は削除せず、`pending`、`approved`、`rejected`の状態で管理する。

## スキーマ変更時

1. modelだけでなくschema、CRUD、router、フロント利用箇所を確認する。
2. 既存データがある前提で、型変換、NULL、重複、外部キーへの影響を確認する。
3. `Base.metadata.create_all()`は既存テーブルの型や制約を更新しないことを前提にする。
4. 既存DBの変更には明示的なDDLまたはマイグレーションが必要。
5. テーブル削除や全データ削除を、ユーザーの許可なく実行しない。
6. PostgreSQLでDDLを適用する前に、対象テーブル、制約、データ件数を読み取り確認する。

## クエリ・更新方針

- SQLAlchemy 2系の`select`と`Session.execute`を既存コードに合わせて使う。
- 期間対象のクエリには`period.start <= date <= period.end`の条件を付ける。
- 日付・ユーザー順の安定した表示が必要な取得では`order_by`を指定する。
- 日別メンバーへの集約は現行どおりCRUDで行い、schemaへ変換して返す。
- 一括更新は削除と挿入を同一トランザクション内で行う。
- スタッフ削除時の希望・シフト削除はDBのcascadeを維持する。

## 検証

- Python構文確認:

```bash
python -m compileall backend/app
```

- model変更時はPostgreSQL上の実型と制約を確認する。
- CRUD変更時は対象期間外の行が維持されることを確認する。
- 外部キー変更時は親削除、存在しない親の登録、型一致を確認する。
- DDLまたはマイグレーションを作成した場合は、適用前後とロールバック手順を記録する。
