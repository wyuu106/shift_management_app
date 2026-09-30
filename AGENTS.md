# AGENTS.md

## プロジェクト概要

飲食店向けのシフト管理Webアプリ。スタッフのシフト希望提出、管理者のシフト作成、確定シフトの共有、ユーザー登録申請の管理を行う。

- フロントエンド: React 19 / Vite / JavaScript
- バックエンド: FastAPI / Python
- データベース: PostgreSQL / SQLAlchemy
- 認証: JWT Bearer認証

実装前に、対象機能に応じて以下を確認すること。
また、以下のファイルはユーザーの許可なしに変更しないこと。

- 共通要件: `docs/requirements/README.md`
- 管理者要件: `docs/requirements/admin.md`
- スタッフ要件: `docs/requirements/staff.md`
- ディレクトリ構成: `docs/architecture/directory-structure.md`
- フロントエンド開発: `.agents/skills/frontend-dev/SKILL.md`
- バックエンド開発: `.agents/skills/backend-dev/SKILL.md`
- DB開発: `.agents/skills/database-dev/SKILL.md`

## 基本方針

- 既存の要件、画面遷移、API契約、DB構造を正とし、依頼されていない仕様変更を行わない。
- 管理者とスタッフの権限境界を維持する。
- ユーザーIDは文字列型として扱う。数値型へ変更しない。
- 日付はAPI・DBでは`YYYY-MM-DD`として扱い、画面表示時のみ日本語形式へ変換する。
- シフト期間は現在1件のみ保持する設計。期間登録時は既存の期間と営業日を置き換える。
- シフト希望と確定シフトは、対象期間内の既存データを削除してから一括登録する。
- 休業日は`business_dates`に含まれない日として扱う。画面上では「休」と表示する。
- 新しいシフト期間を画面で指定した際のデフォルト休業日は日曜日と水曜日。
- パスワードを平文で保存・ログ出力しない。
- `.env`、秘密鍵、DB接続情報をコミットしない。
- 既存の日本語UIとスマートフォン中心のレスポンシブ設計を維持する。
- API通信はページで行い、表示コンポーネントはpropsを中心に受け取る。

## 実装上の境界

- `frontend/src/pages/`: API取得、送信、ページ状態、画面固有の処理
- `frontend/src/components/`: 再利用可能な表示・ナビゲーション部品
- `frontend/src/utils/`: APIクライアント、日付、エラー処理
- `frontend/src/hooks/`: 複数画面で利用するReact Hook
- `backend/app/routers/`: HTTP入出力、依存注入、権限確認
- `backend/app/cruds/`: DB検索、登録、更新、削除、トランザクション
- `backend/app/schemas/`: PydanticによるAPIデータ契約
- `backend/app/models/`: SQLAlchemyによるテーブル定義

## コーディング規約

- 初学者が追えるよう、処理単位で適度に改行し、長い一行のJSXやPythonを書かない。
- 既存の命名と責務分離に合わせる。
- コメントは処理意図の補足に限定し、コードをそのまま言い換えるコメントは増やさない。
- エラーは既存の`detail`形式と`getErrorMessage`を利用する。
- 登録系の成功通知は既存の`SuccessPopup`を使う。
- シフト登録とシフト希望提出で未保存の変更がある場合は、既存の`useUnsavedChanges`による離脱警告を維持する。
- 破壊的なDB操作やスキーマ変更は、対象データと影響範囲を確認してから行う。

## 検証

フロントエンド変更後:

```bash
cd frontend
npm run lint
npm run build
```

バックエンド変更後:

```bash
python -m compileall backend/app
```

共通:

```bash
git diff --check
```

自動テストは現時点で用意されていないため、変更したAPIと対応画面の主要操作を手動でも確認すること。
