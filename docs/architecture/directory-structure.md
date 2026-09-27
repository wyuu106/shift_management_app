# ディレクトリ構成

## 1. 全体構成

```text
shift_management_app/
├── AGENTS.md
├── README.md
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── db.py
│       ├── routers/
│       ├── cruds/
│       ├── schemas/
│       ├── models/
│       └── utils/
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       ├── hooks/
│       ├── layouts/
│       ├── pages/
│       │   ├── auth/
│       │   ├── admin/
│       │   └── staff/
│       └── utils/
├── docs/
│   ├── requirements/
│   └── architecture/
├── .agents/
│   └── skills/
└── images/
```

## 2. バックエンド

### `backend/app/main.py`

- FastAPIアプリケーション生成
- SQLAlchemyメタデータによるテーブル作成
- CORS設定
- 初期管理者作成API
- 各routerの登録

### `backend/app/db.py`

- `DATABASE_URL`の読み込み
- SQLAlchemy EngineとSessionの生成
- FastAPI用`get_db`依存関数

### `backend/app/routers/`

HTTP層。パス、HTTPメソッド、リクエスト・レスポンス型、認証依存、管理者権限を扱う。

| ファイル | 責務 |
| --- | --- |
| `user_router.py` | 登録申請、承認・却下、ログイン、ユーザー管理 |
| `period_router.py` | シフト期間・営業日の取得と登録 |
| `shift_router.py` | 希望と確定シフトの取得・登録 |

ルーターには複雑なDB処理を置かず、CRUD関数へ委譲する。

### `backend/app/cruds/`

DB操作と業務ルールを担当する。

| ファイル | 責務 |
| --- | --- |
| `user_crud.py` | ユーザー・申請検索、承認、却下、削除、ログイン |
| `period_crud.py` | 現在期間と営業日の置換・取得 |
| `shift_crud.py` | 希望と確定シフトの期間単位の取得・一括更新 |

更新処理では、必要に応じて`commit`、例外時の`rollback`を行う。

### `backend/app/schemas/`

PydanticによるAPI契約。HTTP入出力で使うフィールドと型を定義する。

- `user_schema.py`: 登録申請とユーザー
- `period_schema.py`: シフト期間と営業日
- `shift_schema.py`: 希望、確定シフト、日別メンバー

### `backend/app/models/`

SQLAlchemyによるPostgreSQLテーブル定義。

- `user_model.py`: `users`、`user_requests`
- `period_model.py`: `shift_periods`、`business_dates`
- `shift_model.py`: `shift_requests`、`shifts`

### `backend/app/utils/`

- `auth.py`: パスワードハッシュ、検証、JWT生成・復号、現在ユーザー取得
- `period_util.py`: 現在のシフト期間取得と404処理

## 3. フロントエンド

### `frontend/src/main.jsx`

Reactアプリケーションのエントリーポイント。

### `frontend/src/App.jsx`

- Data Routerの定義
- 公開画面、スタッフ画面、管理者画面のルーティング
- ロールごとの初期遷移
- `ProtectedRoute`による保護ルート構成

### `frontend/src/pages/`

ページ単位のコンポーネント。API通信、送信データ生成、読み込み・エラー・保存状態など、画面固有の状態を扱う。

#### `auth/`

- `Login.jsx`: ログインとセッション保存
- `Register.jsx`: アカウント登録申請

#### `admin/`

- `AdminShifts.jsx`: 全データ取得、カレンダー編集、希望反映、確定シフト登録
- `ShiftPeriodPage.jsx`: 期間・営業日の編集と登録
- `AdminOthers.jsx`: 管理メニューとログアウト
- `UsersPage.jsx`: ユーザー一覧・削除
- `UserRequestsPage.jsx`: 登録申請の承認・却下
- `admin.css`: 管理画面固有スタイル

#### `staff/`

- `StaffShifts.jsx`: 店舗全体の確定シフト表示
- `ShiftRequestPage.jsx`: 自分の希望編集・提出
- `StaffOthers.jsx`: ログアウト
- `staff.css`: スタッフ画面と共通メニューのスタイル

### `frontend/src/components/`

| ファイル | 責務 |
| --- | --- |
| `Calender.jsx` | 期間、営業日、シフトをpropsで受け取るカレンダー表示 |
| `Feedback.jsx` | 読み込み、空状態、エラー、通知、成功モーダル |
| `PageHeader.jsx` | ページ見出しと右上アクション |
| `BackButton.jsx` | 指定パスへ戻る共通ボタン |
| `ProtectedRoute.jsx` | JWT・ロールに基づく画面保護 |
| `AdminBottomNav.jsx` | 管理者用下部ナビゲーション |
| `StaffBottomNav.jsx` | スタッフ用下部ナビゲーション |

`Calender.jsx`はAPI通信を行わず、`period`と`shifts`を受け取って表示する。管理者から`onDateSelect`を渡した場合のみ日付編集を可能にする。

### `frontend/src/layouts/`

- `AdminLayout.jsx`: 管理者ページの`Outlet`と下部ナビ
- `StaffLayout.jsx`: スタッフページの`Outlet`と下部ナビ
- `layout.css`: 共通レイアウトと下部ナビ用余白

### `frontend/src/hooks/`

- `useUnsavedChanges.js`: 未保存変更があるページの遷移・ブラウザ離脱警告

### `frontend/src/utils/`

- `api.js`: Axiosインスタンス、Bearer付与、JWT有効性確認、401処理、セッション削除
- `date.js`: API日付キーと日本語表示の変換
- `error.js`: Axiosエラーから表示用メッセージを取得

## 4. 依存方向

```text
Frontend page
  ├── component / layout / hook / util
  └── HTTP API
         ↓
Backend router
  ├── schema
  ├── auth dependency
  └── CRUD
         ↓
SQLAlchemy model / PostgreSQL
```

- componentからpageをimportしない。
- CRUDからrouterをimportしない。
- modelへ画面やHTTP固有の処理を置かない。
- APIレスポンスを変更する場合はschema、CRUD、router、利用ページをまとめて確認する。

## 5. 設定・生成物

- `backend/.env`、`frontend/.env`: ローカル設定。Git管理しない。
- `.env.example`: 必要な環境変数の雛形。
- `frontend/dist/`: Viteのビルド生成物。直接編集しない。
- `frontend/node_modules/`: npm依存。直接編集しない。
- `images/`: READMEで使用する画面キャプチャ。
