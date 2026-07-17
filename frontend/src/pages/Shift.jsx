// シフト確認ページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/button.css"
import "../styles/shift.css"

function Shift () {
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [shifts, setShifts] = useState([]);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const getShift = async () => {
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

      const periodData = periodRes.data;

      setPeriod(periodData);

      // 確定シフト取得
      const shiftRes = await axios.get(
        `${API_URL}/shifts`,
        {
          params: {
            start: periodData.start,
            end: periodData.end,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setShifts(
        shiftRes.data
      );

    } catch(error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  useEffect(() => {
    getShift();
  }, []);

  // start〜endの日付一覧作成
  const createDates = (
    start,
    end
  ) => {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);

    while(current <= last) {
      dates.push(
        current.toISOString().split("T")[0]
      );

      current.setDate(
        current.getDate() + 1
      );
    }

    return dates;
  };

  if(!period) {
    return (
      <div>
        <p>シフト期間が登録されていません</p>
        <button
          className="button-base"
          onClick={() => 
            navigate(role === "admin" ? "/admin" : "/staff")
          }
        >
          戻る
        </button>
      </div>
    );
  }

  const dates = createDates(
    period.start,
    period.end
  );

  return (
    <div className="shift-container">
      <h2>{period.name}</h2>

      <button 
        className="button-base"
        onClick={() => 
          navigate(role === "admin" ? "/admin" : "/staff")
        }
      >
        戻る
      </button>

      <div className="shift-header">
        {
          [
            "月",
            "火",
            "水",
            "木",
            "金",
            "土",
            "日",
          ].map(day => (

           <div key={day}>
              {day}
            </div>
          ))
        }
      </div>

      <div className="shift-grid">
        {
          dates.map(date => {
            const shift =
              shifts.find(
                (shift) =>
                  shift.shift_date === date
              );

            return (
              <div
                className="shift-cell"
                key={date}
              >
                <div className="shift-date">
                  {date.slice(5)}
                </div>

                {
                  shift?.members.map(
                    member => (
                      <div
                        className="member"
                        key={member.user_id}
                      >
                        <div>
                          {member.user_name}
                        </div>

                        {
                          member.remark && (
                            <div className="remark">
                              {member.remark}
                            </div>
                          )
                        }
                      </div>
                    )
                  )
                }
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

export default Shift;