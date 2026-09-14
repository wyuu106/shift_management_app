import { useCallback, useEffect, useState } from "react";
import Calender from "../../components/Calender";
import PageHeader from "../../components/PageHeader";
import { Empty, ErrorMessage, Loading } from "../../components/Feedback";
import { api } from "../../utils/api";
import { getErrorMessage } from "../../utils/error";

function StaffShifts() {
  const [period, setPeriod] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [periodRes, shiftRes] = await Promise.all([
        api.get("/period"),
        api.get("/shifts"),
      ]);

      setPeriod(periodRes.data);
      setShifts(shiftRes.data);
      setStatus("ready");
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus(err.response?.status === 404 ? "empty" : "error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="page">
      <PageHeader
        title="確定シフト"
      />
      {status === "loading" && <Loading label="シフトを読み込んでいます" />}
      {status === "empty" && (
        <Empty
          icon="休"
          title="シフト期間が未設定です"
          description="管理者が期間を設定すると、ここに表示されます。"
        />
      )}
      {status === "error" && <ErrorMessage message={error} onRetry={load} />}
      {status === "ready" && (
        <Calender period={period} shifts={shifts} />
      )}
    </div>
  );
}

export default StaffShifts;
