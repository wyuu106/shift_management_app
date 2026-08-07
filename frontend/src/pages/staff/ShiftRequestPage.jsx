import { useCallback, useEffect, useMemo, useState } from "react";
import { eachDayOfInterval, parseISO } from "date-fns";
import PageHeader from "../../components/PageHeader";
import {
  Empty,
  ErrorMessage,
  Loading,
  Notice,
  SuccessPopup,
} from "../../components/Feedback";
import { api } from "../../utils/api";
import { dateKey, formatDate } from "../../utils/date";
import { getErrorMessage } from "../../utils/error";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";
import "./staff.css";

function ShiftRequestPage() {
  const [period, setPeriod] = useState(null);
  const [requests, setRequests] = useState({});
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useUnsavedChanges(hasUnsavedChanges);

  const load = useCallback(async () => {
    try {
      const [periodRes, requestRes] = await Promise.all([
        api.get("/period"),
        api.get("/user/shift/requests"),
      ]);
      setPeriod(periodRes.data);
      setRequests(
        Object.fromEntries(
          requestRes.data.shift_dates.map((item) => [
            dateKey(item.shift_date),
            { selected: true, remark: item.remark || "" },
          ]),
        ),
      );
      setStatus("ready");
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus(err.response?.status === 404 ? "empty" : "error");
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const businessDates = useMemo(() => {
    if (!period) return [];
    const allowed = new Set(period.business_dates.map(dateKey));
    return eachDayOfInterval({
      start: parseISO(period.start),
      end: parseISO(period.end),
    })
      .map(dateKey)
      .filter((key) => allowed.has(key));
  }, [period]);

  const update = (key, changes) => {
    setHasUnsavedChanges(true);

    setRequests((current) => ({
      ...current,
      [key]: { selected: false, remark: "", ...current[key], ...changes },
    }));
  };

  const submit = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = businessDates
        .filter((key) => requests[key]?.selected)
        .map((key) => ({
          shift_date: key,
          remark: requests[key]?.remark.trim() || null,
        }));
      const res = await api.put("/shift/request", payload);
      setHasUnsavedChanges(false);
      setMessage(res.data.message || "シフト希望を登録しました");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="シフト希望"
        description="出勤できる日を選んで、必要なら備考を入力してね。選び直して送信すると内容が更新されます。"
      />
      <SuccessPopup
        message={message}
        onClose={() => setMessage("")}
      />
      {error && status === "ready" && <Notice type="error">{error}</Notice>}
      {status === "loading" && <Loading label="登録期間を読み込んでいます" />}
      {status === "empty" && (
        <Empty
          icon="休"
          title="受付中の期間がありません"
          description="管理者が受付期間を設定するまで待ってね。"
        />
      )}
      {status === "error" && <ErrorMessage message={error} onRetry={load} />}
      {status === "ready" && (
        <>
          <div className="request-summary card">
            <div>
              <span className="badge badge--primary">受付期間</span>
              <strong>{period.name || "シフト希望"}</strong>
            </div>
            <p>
              {formatDate(period.start, "M/d")} 〜{" "}
              {formatDate(period.end, "M/d")}
            </p>
          </div>
          <div className="request-list">
            {businessDates.map((key) => {
              const selected = Boolean(requests[key]?.selected);
              return (
                <article
                  className={`request-day card ${selected ? "request-day--selected" : ""}`}
                  key={key}
                >
                  <button
                    className="request-day__toggle"
                    onClick={() => update(key, { selected: !selected })}
                    aria-pressed={selected}
                  >
                    <span className="request-day__check">
                      {selected ? "✓" : ""}
                    </span>
                    <span>
                      <strong>{formatDate(key)}</strong>
                      <small>{selected ? "出勤できます" : "お休み希望"}</small>
                    </span>
                  </button>
                  {selected && (
                    <input
                      className="input"
                      value={requests[key]?.remark || ""}
                      onChange={(e) => update(key, { remark: e.target.value })}
                      placeholder="備考（時間帯など・任意）"
                    />
                  )}
                </article>
              );
            })}
          </div>
          <div className="sticky-action">
            <span>
              <strong>
                {businessDates.filter((key) => requests[key]?.selected).length}
              </strong>
              日を選択中
            </span>
            <button className="button" onClick={submit} disabled={saving}>
              {saving ? "送信中…" : "希望を登録"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ShiftRequestPage;
