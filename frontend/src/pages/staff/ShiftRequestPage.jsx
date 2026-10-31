import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useSearchParams } from "react-router-dom";
import PeriodSelector from "../../components/PeriodSelector";
import ConflictReload from "../../components/ConflictReload";
import "./staff.css";

function ShiftRequestPage() {
  const loadRequest = useRef(0);
  const [searchParams] = useSearchParams();
  const periodId = searchParams.get("period_id");
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState(null);
  const [requests, setRequests] = useState({});
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [version, setVersion] = useState(0);
  const [conflict, setConflict] = useState(false);

  useUnsavedChanges(hasUnsavedChanges);

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current;
    setStatus("loading");
    setError("");
    try {
      const listRes = await api.get("/periods");
      if (requestId !== loadRequest.current) return;
      setPeriods(listRes.data);
      const selected = await api.get("/period", {
        params: { period_id: periodId, latest: true },
      });
      if (requestId !== loadRequest.current) return;
      const [periodRes, requestRes] = await Promise.all([
        Promise.resolve(selected),
        api.get("/user/shift/requests", { params: { period_id: selected.data.id } }),
      ]);
      if (requestId !== loadRequest.current) return;
      setPeriod(periodRes.data);
      setVersion(requestRes.data.version);
      setConflict(false);
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
      if (requestId !== loadRequest.current) return;
      setPeriod(null);
      setError(getErrorMessage(err));
      setStatus(err.response?.status === 404 ? "empty" : "error");
    }
  }, [periodId]);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => {
      window.clearTimeout(timer);
      loadRequest.current += 1;
    };
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
      const res = await api.put("/shift/request", payload, {
        params: { period_id: period.id, expected_version: version },
      });
      setVersion(res.data.version);
      setHasUnsavedChanges(false);
      setMessage(res.data.message || "シフト希望を登録しました");
    } catch (err) {
      setError(getErrorMessage(err));
      setConflict(err.response?.status === 409);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <fieldset className="edit-controls" disabled={saving}>
        <PageHeader
          title="シフト希望"
        />
        <SuccessPopup
          message={message}
          onClose={() => setMessage("")}
        />
        {status !== "ready" && (
          <PeriodSelector periods={periods} period={period} disabled={saving || status === "loading"} />
        )}
        {error && status === "ready" && <Notice type="error">{error}</Notice>}
        {conflict && <ConflictReload onReload={load} />}
        {status === "loading" && <Loading label="登録期間を読み込んでいます" />}
        {status === "empty" && (
          <Empty
            icon="休"
            title="受付中の期間がありません"
            description="管理者が期間を設定すると、ここに表示されます。"
          />
        )}
        {status === "error" && <ErrorMessage message={error} onRetry={load} />}
        {status === "ready" && (
          <>
            <div className="request-summary card">
              <div>
                <span className="badge badge--primary">受付期間</span>
                <PeriodSelector periods={periods} period={period} disabled={saving} />
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
      </fieldset>
    </div>
  );
}

export default ShiftRequestPage;
