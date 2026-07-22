// 管理者用シフト画面

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eachDayOfInterval, format } from "date-fns";
import axios from "axios";

import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import { useShift } from "../contexts/ShiftContext";

import ShiftCalendar from "../components/ShiftCalendar";

import "../styles/button.css";

function AdminShift() {
  const navigate = useNavigate();

  const { shifts, setShifts } = useShift();

  const [period, setPeriod] = useState(null);
  const [dates, setDates] = useState([]);

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

      setDates(
        eachDayOfInterval({
          start: new Date(currentPeriod.start),
          end: new Date(currentPeriod.end),
        }).map(date => format(date, "yyyy-MM-dd"))
      );

      // Contextが空なら取得
      if (shifts.length === 0) {
        const shiftRes = await axios.get(
          `${API_URL}/shifts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setShifts(shiftRes.data);
      }

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  // 希望取得
  const handleLoadRequests = async () => {
    if (!window.confirm("シフト希望を反映させますか？")) {
      return;
    }

    try {
      const res = await axios.get(
        `${API_URL}/shift/requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setShifts(res.data);

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  // シフト登録
  const handleRegister = async () => {
    try {
      await axios.put(
        `${API_URL}/shift`,
        shifts,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("シフトを登録しました");

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (!window.confirm("入力内容を破棄しますか？")) {
      return;
    }
    navigate("/admin");
  };

  if (!period) {
    return <p>読み込み中...</p>;
  }

  return (
    <div>
      <ShiftCalendar
        period={period}
        dates={dates}
        shifts={shifts}
        onCellClick={(date) =>
          navigate(`/admin/shift/${date}`)
        }
      />

      <div className="button-group">
        <button
          className="button-base"
          onClick={handleCancel}
        >
          戻る
        </button>

        <button
          className="button-base"
          onClick={handleLoadRequests}
        >
          希望を取得
        </button>

        <button
          className="button-base button-primary"
          onClick={handleRegister}
          disabled={shifts.length === 0}
        >
          登録
        </button>
      </div>
    </div>
  );
}

export default AdminShift;