import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Calender from "../../components/Calender";
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
import "./admin.css";

function AdminShifts() {
  const [period, setPeriod] = useState(null);
  const [users, setUsers] = useState([]);
  const [days, setDays] = useState({});
  const [requests, setRequests] = useState([]);
  const [openDate, setOpenDate] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useUnsavedChanges(hasUnsavedChanges);

  const load = useCallback(async () => {
    try {
      const [periodRes, usersRes, shiftsRes, requestsRes] = await Promise.all([
        api.get("/period"),
        api.get("/users"),
        api.get("/shifts"),
        api.get("/shift/requests"),
      ]);
      const initial = {};
      periodRes.data.business_dates.forEach((date) => {
        initial[dateKey(date)] = {};
      });
      shiftsRes.data.forEach((day) => {
        initial[dateKey(day.shift_date)] = Object.fromEntries(
          day.members.map((member) => [
            String(member.user_id),
            { selected: true, remark: member.remark || "" },
          ]),
        );
      });
      setPeriod(periodRes.data);
      setUsers(usersRes.data.filter((user) => user.role !== "admin"));
      setRequests(requestsRes.data);
      setDays(initial);
      setOpenDate("");
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

  const requestMap = useMemo(
    () =>
      new Map(requests.map((day) => [dateKey(day.shift_date), day.members])),
    [requests],
  );
  const calendarShifts = useMemo(() => {
    const userMap = new Map(users.map((user) => [String(user.id), user]));
    if (!period) return [];

    return period.business_dates.map((date) => {
      const key = dateKey(date);
      const members = Object.entries(days[key] || {})
        .filter(([, value]) => value.selected)
        .map(([userId, value]) => ({
          user_id: userId,
          user_name: userMap.get(userId)?.name || userId,
          remark: value.remark,
        }));
      return { shift_date: key, members };
    });
  }, [days, period, users]);

  const updateMember = (date, userId, changes) => {
    setHasUnsavedChanges(true);

    setDays((current) => ({
      ...current,
      [date]: {
        ...current[date],
        [userId]: {
          selected: false,
          remark: "",
          ...current[date]?.[userId],
          ...changes,
        },
      },
    }));
  };

  const importRequests = () => {
    setHasUnsavedChanges(true);

    setDays((current) => {
      const next = structuredClone(current);
      requests.forEach((day) => {
        const key = dateKey(day.shift_date);
        next[key] ||= {};
        day.members.forEach((member) => {
          next[key][String(member.user_id)] = {
            selected: true,
            remark: member.remark || "",
          };
        });
      });
      return next;
    });
    setMessage("スタッフの希望をシフト案に反映しました");
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = period.business_dates.map((date) => {
        const key = dateKey(date);
        return {
          shift_date: key,
          members: Object.entries(days[key] || {})
            .filter(([, value]) => value.selected)
            .map(([userId, value]) => ({
              user_id: userId,
              remark: value.remark.trim() || null,
            })),
        };
      });
      const res = await api.put("/shift", payload);
      setHasUnsavedChanges(false);
      setMessage(res.data.message || "シフトを登録しました");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="シフト編集"
        action={
          <button
            className="button button--secondary"
            onClick={importRequests}
            disabled={status !== "ready"}
          >
            希望を反映
          </button>
        }
      />
      <SuccessPopup
        message={message}
        onClose={() => setMessage("")}
      />
      {error && status === "ready" && <Notice type="error">{error}</Notice>}
      {status === "loading" && <Loading label="シフト情報を読み込んでいます" />}
      {status === "empty" && (
        <Empty
          icon="＋"
          title="シフト期間が未設定です"
          description="シフト期間を設定してください。"
        />
      )}
      {status === "error" && <ErrorMessage message={error} onRetry={load} />}
      {status === "ready" && (
        <>
          <div className="admin-shift-calendar">
            <Calender
              period={period}
              shifts={calendarShifts}
              onDateSelect={setOpenDate}
              selectedDate={openDate}
            />
          </div>
          {openDate && (
            <div
              className="shift-sheet-layer"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpenDate("");
              }}
            >
              <section
                className="shift-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="shift-sheet-title"
              >
                <header className="shift-sheet__header">
                  <div>
                    <h2 id="shift-sheet-title">{formatDate(openDate)}</h2>
                    <span>
                      希望 {requestMap.get(openDate)?.length || 0}人・選択{" "}
                      {
                        Object.values(days[openDate] || {}).filter(
                          (item) => item.selected,
                        ).length
                      }
                      人
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shift-sheet__close"
                    onClick={() => setOpenDate("")}
                    aria-label="閉じる"
                  >
                    ×
                  </button>
                </header>
                <div className="shift-sheet__body">
                  {users.length === 0 ? (
                    <p className="muted">登録済みスタッフがいません。</p>
                  ) : (
                    users.map((user) => {
                      const value = days[openDate]?.[String(user.id)] || {
                        selected: false,
                        remark: "",
                      };
                      const requested = requestMap
                        .get(openDate)
                        ?.some(
                          (member) =>
                            String(member.user_id) === String(user.id),
                        );
                      return (
                        <div
                          className={`member-row ${value.selected ? "member-row--selected" : ""}`}
                          key={user.id}
                        >
                          <button
                            type="button"
                            className="member-row__toggle"
                            onClick={() =>
                              updateMember(openDate, String(user.id), {
                                selected: !value.selected,
                              })
                            }
                          >
                            <span className="member-row__check">
                              {value.selected ? "✓" : ""}
                            </span>
                            <span>
                              <strong>{user.name}</strong>
                              {requested && <small>希望あり</small>}
                            </span>
                          </button>
                          {value.selected && (
                            <input
                              className="input"
                              value={value.remark}
                              onChange={(e) =>
                                updateMember(openDate, String(user.id), {
                                  remark: e.target.value,
                                })
                              }
                              placeholder="備考（時間帯など）"
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <footer className="shift-sheet__footer">
                  <button
                    type="button"
                    className="button button--block"
                    onClick={() => setOpenDate("")}
                  >
                    この日の編集を完了
                  </button>
                </footer>
              </section>
            </div>
          )}
          <div className="admin-shift-save-action">
            <button className="button" onClick={save} disabled={saving}>
              {saving ? "保存中…" : "シフトを登録"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminShifts;
