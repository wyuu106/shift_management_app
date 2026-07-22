// スタッフ用シフト画面

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eachDayOfInterval, format } from "date-fns";
import axios from "axios";

import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";

import ShiftCalendar from "../components/ShiftCalendar";

import "../styles/button.css";

function Shift() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [dates, setDates] = useState([]);
  const [shifts, setShifts] = useState([]);

  const token = localStorage.getItem("token");


  useEffect(() => {
    init();
  }, []);


  const init = async () => {
    try {
      // 期間取得
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
        }).map(date =>
          format(date, "yyyy-MM-dd")
        )
      );


      // 確定シフト取得
      const shiftRes = await axios.get(
        `${API_URL}/shifts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setShifts(shiftRes.data);


    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
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
      />

      <button
        className="button-base"
        onClick={() => navigate("/staff")}
      >
        戻る
      </button>
    </div>
  );
}

export default Shift;