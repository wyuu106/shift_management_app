// Browser plugin not available: Playwrightで、APIをモックした画面操作を検証する。
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.TEST_FRONTEND_URL || "http://127.0.0.1:5173";
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

const periods = [
  { id: 1, name: "11月前半", start: "2026-11-01", end: "2026-11-15",
    business_dates: ["2026-11-01", "2026-11-02"], shift_version: 0 },
  { id: 2, name: "11月後半", start: "2026-11-16", end: "2026-11-30",
    business_dates: ["2026-11-16", "2026-11-17"], shift_version: 0 },
];

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function setup(t, role, { onSave, mobile = false } = {}) {
  const context = await browser.newContext({ viewport: mobile
    ? { width: 320, height: 760 } : { width: 1280, height: 900 } });
  t.after(() => context.close());
  await context.addInitScript((role) => {
    // フロント表示用のダミー。実JWT認証はバックエンドの別テストで検証する。
    localStorage.setItem("token", `test.${btoa(JSON.stringify({
      sub: "staff", exp: Math.floor(Date.now() / 1000) + 3600,
    }))}.test`);
    localStorage.setItem("role", role);
  }, role);
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (!["xhr", "fetch"].includes(request.resourceType())) return route.continue();
    const url = new URL(request.url());
    const reply = (json, status = 200) => route.fulfill({ status, json });
    const period = periods.find((p) => p.id === Number(url.searchParams.get("period_id")))
      || (url.searchParams.get("latest") === "true" ? periods[1] : periods[0]);
    if (request.method() === "PUT") {
      if (onSave) return onSave(route, url);
      return reply({ message: "登録完了", version: 1 });
    }
    switch (url.pathname) {
      case "/periods": return reply(periods);
      case "/period":
        if (url.searchParams.get("period_id") === "bad") {
          return reply({ detail: [{ msg: "入力値が不正です", loc: ["query", "period_id"] }] }, 422);
        }
        return reply(period);
      case "/users": return reply([{ id: "staff", name: "テストスタッフ", role: "staff" }]);
      case "/shifts": return reply(period.business_dates.map((day) => ({
        shift_date: day, members: [{ user_id: "staff", user_name: "テストスタッフ", remark: "" }],
      })));
      case "/shift/requests": return reply([]);
      case "/user/shift/requests": return reply({
        user_id: "staff", user_name: "テストスタッフ", version: 0,
        shift_dates: [{ shift_date: period.business_dates[0], remark: "" }],
      });
      default: throw new Error(`未定義のAPI: ${url.pathname}`);
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/status of (409|422)/.test(message.text())) {
      errors.push(message.text());
    }
  });
  t.after(() => assert.deepEqual(errors, []));
  return page;
}

test("管理者：保存中は編集不可、成功モーダルでTabが背後へ抜けない", async (t) => {
  const received = deferred();
  const release = deferred();
  const page = await setup(t, "admin", { onSave: async (route, url) => {
    assert.equal(url.searchParams.get("expected_version"), "0");
    received.resolve();
    await release.promise;
    await route.fulfill({ json: { message: "登録完了", version: 1 } });
  }});
  await page.goto(`${baseURL}/admin/shifts`);
  await page.getByRole("button", { name: "11月1日のシフトを編集" }).click();
  await page.getByPlaceholder("備考（時間帯など）").fill("編集内容");
  await page.getByRole("button", { name: "この日の編集を完了" }).click();
  await page.getByRole("button", { name: "シフトを登録", exact: true }).click();
  await received.promise;
  assert.equal(await page.getByRole("button", { name: "希望を反映" }).isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: "11月1日のシフトを編集" }).isDisabled(), true);
  release.resolve();
  await page.getByRole("dialog", { name: "処理完了" }).waitFor();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest("dialog"))), true);
  }
  await page.screenshot({ path: "/private/tmp/shift-review-modal.png", animations: "disabled" });
  await page.getByRole("button", { name: "戻る", exact: true }).click();
  await page.getByRole("link", { name: "その他" }).click();
  await page.getByRole("heading", { name: "その他", exact: true }).waitFor();
});

test("スタッフ：競合時に編集内容を保持、期間切り替えキャンセルも保持", async (t) => {
  const page = await setup(t, "staff", { mobile: true, onSave: (route) => route.fulfill({
    status: 409, json: { detail: "他の画面で更新されています。最新のデータを読み直してください" },
  }) });
  await page.goto(`${baseURL}/staff/shift/requests`);
  const selector = page.getByRole("combobox", { name: "シフト期間を選択" });
  await page.getByPlaceholder("備考（時間帯など・任意）").fill("失いたくない内容");
  assert.equal(await selector.inputValue(), "2");
  await page.getByRole("button", { name: "希望を登録", exact: true }).click();
  await page.getByRole("button", { name: "最新のデータを読み込む" }).waitFor();
  assert.equal(await page.getByPlaceholder("備考（時間帯など・任意）").inputValue(), "失いたくない内容");
  page.once("dialog", (dialog) => dialog.dismiss());
  await selector.selectOption("1");
  assert.equal(await selector.inputValue(), "2");
  assert.equal(await page.getByPlaceholder("備考（時間帯など・任意）").inputValue(), "失いたくない内容");
  page.once("dialog", (dialog) => dialog.accept());
  await selector.selectOption("1");
  await page.waitForURL("**/staff/shift/requests?period_id=1");
  await page.getByRole("button", { name: /11月1日/ }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "/private/tmp/shift-review-mobile.png", animations: "disabled" });
});

test("スタッフ：保存中の入力を無効化し、次の保存には新バージョンを送信", async (t) => {
  const received = deferred();
  const release = deferred();
  const versions = [];
  const page = await setup(t, "staff", { onSave: async (route, url) => {
    versions.push(url.searchParams.get("expected_version"));
    if (versions.length === 1) {
      received.resolve();
      await release.promise;
    }
    await route.fulfill({ json: { message: "登録完了", version: versions.length } });
  }});
  await page.goto(`${baseURL}/staff/shift/requests`);
  const input = page.getByPlaceholder("備考（時間帯など・任意）");
  await input.fill("希望");
  await page.getByRole("button", { name: "希望を登録", exact: true }).click();
  await received.promise;
  assert.equal(await input.isDisabled(), true);
  release.resolve();
  await page.getByRole("button", { name: "戻る", exact: true }).click();
  await input.fill("次の希望");
  await page.getByRole("button", { name: "希望を登録", exact: true }).click();
  await page.getByRole("button", { name: "戻る", exact: true }).waitFor();
  assert.deepEqual(versions, ["0", "1"]);
});

test("422の配列detailでも画面がクラッシュしない", async (t) => {
  const page = await setup(t, "staff");
  await page.goto(`${baseURL}/staff/shifts?period_id=bad`);
  await page.getByText("入力値が不正です", { exact: true }).waitFor();
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
});

test("シフト詳細：TabとShift+Tabを内部で循環し、閉じると日付へ戻る", async (t) => {
  const page = await setup(t, "staff", { mobile: true });
  await page.goto(`${baseURL}/staff/shifts`);
  const trigger = page.getByRole("button", { name: "11月1日のシフト詳細を確認" });
  await trigger.click();
  await page.getByRole("dialog").waitFor();
  for (const key of ["Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest("dialog"))), true);
  }
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);
});
