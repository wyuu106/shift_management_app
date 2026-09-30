import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Calender from "../../components/Calender";
import ShiftEditSheet from "../../components/ShiftEditSheet";
import {
  Empty,
  ErrorMessage,
  Loading,
  Notice,
  SuccessPopup,
} from "../../components/Feedback";
import { api } from "../../utils/api";
import { dateKey } from "../../utils/date";
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
              dateActionLabel="シフトを編集"
            />
          </div>
          <ShiftEditSheet
            date={openDate}
            users={users}
            values={days[openDate]}
            requestedMembers={requestMap.get(openDate)}
            onUpdateMember={(userId, changes) =>
              updateMember(openDate, userId, changes)
            }
            onClose={() => setOpenDate("")}
          />
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
