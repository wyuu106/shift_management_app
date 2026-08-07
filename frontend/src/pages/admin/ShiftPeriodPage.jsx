import { useEffect, useMemo, useState } from "react";
import { eachDayOfInterval, getDay, parseISO } from "date-fns";
import PageHeader from "../../components/PageHeader";
import { Notice, SuccessPopup } from "../../components/Feedback";
import { api } from "../../utils/api";
import { dateKey, formatDate } from "../../utils/date";
import { getErrorMessage } from "../../utils/error";
import "./admin.css";

function ShiftPeriodPage() {
  const [form, setForm] = useState({ name: "", start: "", end: "" });
  const [businessDates, setBusinessDates] = useState(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/period")
      .then(({ data }) => {
        setForm({
          name: data.name || "",
          start: dateKey(data.start),
          end: dateKey(data.end),
        });
        setBusinessDates(new Set(data.business_dates.map(dateKey)));
      })
      .catch(() => {});
  }, []);

  const dates = useMemo(() => {
    if (!form.start || !form.end || form.start > form.end) return [];
    return eachDayOfInterval({
      start: parseISO(form.start),
      end: parseISO(form.end),
    });
  }, [form.start, form.end]);

  const changeDateRange = (name, value) => {
    const next = { ...form, [name]: value };
    setForm(next);
    if (next.start && next.end && next.start <= next.end) {
      const range = eachDayOfInterval({
        start: parseISO(next.start),
        end: parseISO(next.end),
      });
      const defaultBusinessDates = range
        .filter((date) => ![0, 3].includes(getDay(date)))
        .map(dateKey);

      setBusinessDates(new Set(defaultBusinessDates));
    }
  };
  const toggle = (key) =>
    setBusinessDates((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });

  const save = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.start || !form.end || form.start >= form.end) {
      setError("開始日より後の日付を終了日に設定してね。");
      return;
    }

    if (businessDates.size === 0) {
      setError("営業日を1日以上選択してね。");
      return;
    }

    setSaving(true);

    try {
      const response = await api.put("/period", {
        ...form,
        name: form.name.trim() || null,
        business_dates: [...businessDates].sort(),
      });

      setMessage(response.data.message || "期間を保存しました");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="シフト期間の設定"
        description="受付する期間と営業日を設定します。日曜日と水曜日は初期状態で休業日になるよ。"
      />

      <SuccessPopup
        message={message}
        onClose={() => setMessage("")}
      />
      {error && <Notice type="error">{error}</Notice>}

      <form className="card period-form" onSubmit={save}>
        <div className="card__body stack">
          <div className="field">
            <label htmlFor="period-name">期間名</label>
            <input
              id="period-name"
              className="input"
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
              placeholder="例：8月前半シフト"
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="period-start">開始日</label>
              <input
                id="period-start"
                type="date"
                className="input"
                value={form.start}
                onChange={(event) =>
                  changeDateRange("start", event.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="period-end">終了日</label>
              <input
                id="period-end"
                type="date"
                className="input"
                value={form.end}
                onChange={(event) => changeDateRange("end", event.target.value)}
              />
            </div>
          </div>

          {dates.length > 0 && (
            <div>
              <div className="business-date-head">
                <span className="field-label">営業日</span>
                <small>
                  {businessDates.size} / {dates.length}日を選択
                </small>
              </div>

              <div className="business-date-grid">
                {dates.map((date) => {
                  const key = dateKey(date);
                  const active = businessDates.has(key);

                  return (
                    <button
                      type="button"
                      className={active ? "active" : ""}
                      key={key}
                      onClick={() => toggle(key)}
                    >
                      <strong>{formatDate(date, "d")}</strong>
                      <small>{formatDate(date, "E")}</small>
                      <span>{active ? "営業" : "休"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button className="button button--block" disabled={saving}>
            {saving ? "保存中…" : "この期間で保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
export default ShiftPeriodPage;
