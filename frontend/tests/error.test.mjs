import test from "node:test";
import assert from "node:assert/strict";
import { getErrorMessage } from "../src/utils/error.js";

test("APIのdetailは常に表示可能な文字列へ変換する", () => {
  for (const [detail, expected] of [
    ["エラー", "エラー"],
    [[{ msg: "入力エラー" }, { msg: "必須" }], "入力エラー\n必須"],
    [{ message: "競合" }, "競合"],
    [{ unknown: true }, "サーバーエラー"],
    [[], "入力内容を確認してください"],
  ]) {
    assert.equal(getErrorMessage({ response: { data: { detail } } }), expected);
  }
  assert.equal(getErrorMessage({ request: {} }), "サーバーに接続できません");
  assert.equal(getErrorMessage({ response: { data: null } }), "サーバーエラー");
  assert.equal(getErrorMessage(null), "エラーが発生しました");
});
