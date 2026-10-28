import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Calender from "../../components/Calender";
import PageHeader from "../../components/PageHeader";
import ShiftDetailSheet from "../../components/ShiftDetailSheet";
import { Empty, ErrorMessage, Loading } from "../../components/Feedback";
import { api } from "../../utils/api";
import { dateKey } from "../../utils/date";
import { getErrorMessage } from "../../utils/error";
import { useSearchParams } from "react-router-dom";
import PeriodSelector from "../../components/PeriodSelector";

function StaffShifts() {
  const loadRequest = useRef(0);
  const [searchParams] = useSearchParams();
  const periodId = searchParams.get("period_id");
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [openDate, setOpenDate] = useState("");

  const shiftsByDate = useMemo(
    () =>
      new Map(
        shifts.map((shift) => [dateKey(shift.shift_date), shift.members ?? []]),
      ),
    [shifts],
  );

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current;
    setStatus("loading");
    try {
      const listRes = await api.get("/periods");
      if (requestId !== loadRequest.current) return;
      setPeriods(listRes.data);
      const selected = await api.get("/period", { params: { period_id: periodId } });
      if (requestId !== loadRequest.current) return;
      const [periodRes, shiftRes] = await Promise.all([
        Promise.resolve(selected),
        api.get("/shifts", { params: { period_id: selected.data.id } }),
      ]);
      if (requestId !== loadRequest.current) return;

      setPeriod(periodRes.data);
      setShifts(shiftRes.data);
      setOpenDate("");
      setStatus("ready");
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

  return (
    <div className="page">
      <PageHeader
        title="確定シフト"
      />
      {status !== "ready" && (
        <PeriodSelector periods={periods} period={period} disabled={status === "loading"} />
      )}
      {status === "loading" && <Loading label="シフトを読み込んでいます" />}
      {status === "empty" && (
        <Empty
          icon="休"
          title="現在のシフト期間はありません"
          description="既存の期間は「期間を選択」から確認できます。"
        />
      )}
      {status === "error" && <ErrorMessage message={error} onRetry={load} />}
      {status === "ready" && (
        <>
          <Calender
            periodControl={<PeriodSelector periods={periods} period={period} />}
            period={period}
            shifts={shifts}
            onDateSelect={setOpenDate}
            selectedDate={openDate}
          />

          <ShiftDetailSheet
            date={openDate}
            members={shiftsByDate.get(openDate) ?? []}
            onClose={() => setOpenDate("")}
          />
        </>
      )}
    </div>
  );
}

export default StaffShifts;
