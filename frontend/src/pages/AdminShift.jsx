// 管理者用シフト画面

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eachDayOfInterval, format } from "date-fns";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import ShiftCalendar from "../components/ShiftCalendar";
import "../styles/button.css";

function AdminShift() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [dates, setDates] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isCreated, setIsCreated] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      // シフト期間取得
      const periodRes = await axios.get(
        `${API_URL}/period`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const currentPeriod = periodRes.data;
      setPeriod(currentPeriod);

      // カレンダーの日付作成
      setDates(
        eachDayOfInterval({
          start: new Date(currentPeriod.start),
          end: new Date(currentPeriod.end),
        }).map(date => format(date, "yyyy-MM-dd"))
      );

      // 確定シフト取得
      const shiftRes = await axios.get(
        `${API_URL}/shifts`,
        {
          params: {
            start: currentPeriod.start,
            end: currentPeriod.end,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (shiftRes.data.length > 0) {
        setShifts(shiftRes.data);
        setIsCreated(true);
      } else {
        // 未確定なら希望シフト取得
        const requestRes = await axios.get(
          `${API_URL}/shift/requests`,
          {
            params: {
              start: currentPeriod.start,
              end: currentPeriod.end,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setRequests(requestRes.data);
      }

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  if (!period) {
    return (
      <div>
        <p>シフト期間が登録されていません</p>

        <button
          className="button-base"
          onClick={() => navigate("/admin")}
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div>
      <ShiftCalendar
        period={period}
        dates={dates}
        shifts={isCreated ? shifts : requests}
        onCellClick={(date) =>
          navigate(`/admin/shift/${date}`)
        }
      />

      <div className="button-group">
        <button
          className="button-base"
          onClick={() => navigate("/admin")}
        >
          戻る
        </button>
      </div>
    </div>
  );
}

export default AdminShift;