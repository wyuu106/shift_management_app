# データ要件

PostgreSQLのテーブルと、テーブル間の決まりをまとめる。テーブル定義の正は`backend/app/models/`と`backend/alembic/versions/`にある。

---

## 1. テーブル

| テーブル | 用途 | 主な項目 |
| --- | --- | --- |
| `users` | ログイン可能なユーザー | 文字列ID、名前、ハッシュ化パスワード、ロール、認証識別子（`auth_id`） |
| `user_requests` | アカウント登録申請 | 申請ID、希望ユーザーID、名前、ハッシュ化パスワード、状態 |
| `shift_periods` | 複数のシフト期間 | ID、名称、開始日、終了日、確定シフトのバージョン（`shift_version`） |
| `business_dates` | 期間内の営業日 | ID、営業日、期間ID |
| `shift_requests` | スタッフの希望 | ID、希望日、備考、ユーザーID |
| `shift_request_versions` | 希望のバージョン（本人・期間単位） | ユーザーID、期間ID、バージョン |
| `shifts` | 確定シフト | ID、出勤日、備考、ユーザーID |

- `auth_id`はアカウント作成ごとに異なる値で、JWTと照合する（[共通要件 5.2](./README.md)）。
- `shift_version`と`shift_request_versions`は同時編集の検出に使う（[API要件 4](./api.md)）。

---

## 2. 型と制約

- `users.id`、`shift_requests.user_id`、`shifts.user_id`は文字列型で統一する。数値型へ変更しない。
- 申請の状態は`pending`、`approved`、`rejected`のいずれか。
- 未処理（`pending`）の申請は、IDと名前の重複を部分一意インデックスで防ぐ。

---

## 3. 削除の連鎖

- スタッフ削除時は、そのスタッフの希望と確定シフトを外部キーの`ON DELETE CASCADE`で削除する。
- 期間削除時は、その期間の営業日も削除する。
- 期間の上書きでシフト希望を削除し、確定シフトを保持するルールは[シフト期間のルール 2.3](./period.md)を参照。
