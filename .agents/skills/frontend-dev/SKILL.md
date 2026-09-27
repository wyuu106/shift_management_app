---
name: frontend-dev
description: React/Vite製シフト管理アプリの画面、コンポーネント、ルーティング、API連携、スマートフォンUIを実装・修正する際に使う。
---

# Frontend Development

## 参照先

作業前に対象機能の要件を確認する。

- 共通: `docs/requirements/README.md`
- 管理者: `docs/requirements/admin.md`
- スタッフ: `docs/requirements/staff.md`
- 構成: `docs/architecture/directory-structure.md`

## 責務

- `pages/`でAPI通信、ページ固有状態、入力・送信処理を扱う。
- `components/`は再利用可能な表示部品にし、可能な限りpropsでデータを受け取る。
- 共通通信は`utils/api.js`のAxiosインスタンスを利用する。
- APIエラー表示は`utils/error.js`の`getErrorMessage`を利用する。
- API日付は`utils/date.js`で変換し、文字列をブラウザのローカル時刻へ暗黙変換しない。

## 現行の重要な設計

- ルーティングは`createBrowserRouter`と`RouterProvider`を使う。
- 認証画面以外は`ProtectedRoute`でJWTとロールを検証する。
- JWTとロールは`localStorage`の`token`、`role`へ保存する。
- `Calender.jsx`は表示担当。期間・シフト取得を追加せず、ページから`period`と`shifts`を渡す。
- 管理者カレンダーだけ`onDateSelect`を渡して編集可能にする。スタッフ側は閲覧専用。
- 成功通知は`SuccessPopup`、読み込み・空状態・エラーは`Feedback.jsx`の共通部品を使う。
- シフト編集と希望提出の変更検知には`useUnsavedChanges`を使う。保存成功時のみ未保存状態を解除する。
- 下部ナビと固定アクションが重ならないよう、ページ下部へ十分な余白を確保する。

## UI方針

- 320px程度の画面幅から操作可能にする。
- スマートフォンを優先し、デスクトップでは最大幅を設ける。
- ボタンや入力欄は指で押しやすい高さを保つ。
- 固定下部ナビ、モーダル、編集シートではセーフエリアとz-indexを考慮する。
- 休業日は「休」、未確定営業日は「未定」と表示する。
- シフト備考は名前の下へ`（備考）`形式で表示する。
- 既存のCSS変数とクラス体系を再利用し、画面ごとに色や挙動を勝手に変えない。
- 長い一行のJSXを避け、属性や条件分岐を読みやすく改行する。

## API変更時

1. 対応するbackendのrouterとschemaを確認する。
2. HTTPメソッド、パス、認証、送受信フィールドを一致させる。
3. ローディング、404、一般エラー、成功をそれぞれ扱う。
4. 登録処理では二重送信を防ぐため送信中状態を持つ。
5. 401は共通interceptorへ任せ、個別ページでセッション処理を重複させない。

## 検証

```bash
cd frontend
npm run lint
npm run build
```

加えて、変更した画面をスマートフォン幅で確認する。特に以下を確認する。

- 横スクロールが発生しない
- 下部ナビや固定ボタンが内容を隠さない
- モーダル表示中は背後を操作できない
- 管理者・スタッフの画面保護が正しい
- 未保存変更の警告と保存後の解除が正しい
