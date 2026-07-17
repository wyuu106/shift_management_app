// シフト期間登録ページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DatePicker from "react-datepicker";
import { format, eachDayOfInterval } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/button.css";
import "../styles/business_date.css"

function ShiftPeriod () {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [businessDates, setBusinessDates] = useState([]);

  const token = localStorage.getItem("token");

  // 登録
  const handleSubmit = async () => {
    if (!start || !end) {
      alert("期間を選択してください");
      return;
    }

    if (businessDates.length === 0) {
      alert("営業日を1日以上選択してください");
      return;
    }

    try {
      await axios.put(
        `${API_URL}/period`,
        {
          name,
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
          business_dates: businessDates.sort(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("登録しました");
      navigate("/admin")

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (
      name ||
      start ||
      end ||
      businessDates.length > 0
    ) {
      if (!window.confirm("入力内容を破棄しますか？")) {
        return;
      }
    }
    navigate("/admin");
  };

  return (
    <div>
      <h2>シフト期間登録</h2>

      <div>
        <label>期間名</label>

        <br />

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <h3>シフト期間</h3>

        <DatePicker
          selectsRange
          startDate={start}
          endDate={end}
          onChange={(dates) => {
            const [startDate, endDate] = dates;

            setStart(startDate);
            setEnd(endDate);

            // 期間変更時は営業日をリセット
            setBusinessDates([]);
          }}
          inline
        />
      </div>

      {start && end && (
        <div>
          <h3>営業日</h3>

          <div className="business-date-list">
            {eachDayOfInterval({
              start,
              end,
            }).map((date) => {
              const target = format(
                date,
                "yyyy-MM-dd"
              );

              return (
                <label key={target}>
                  <input
                    type="checkbox"
                    checked={businessDates.includes(target)}
                    onChange={() => {
                      if (businessDates.includes(target)) {
                        setBusinessDates(
                          businessDates.filter(
                            (d) => d !== target
                          )
                        );
                      } else {
                        setBusinessDates([
                          ...businessDates,
                          target,
                        ]);
                      }
                    }}
                  />

                  {format(date, "yyyy/MM/dd")}
                </label>
              );
            })}
          </div>
        </div>
      )}


      <div className="button-group">
        <button
          className="button-base"
          onClick={handleCancel}
        >
          キャンセル
        </button>

        <button
          className="button-base button-primary"
          onClick={handleSubmit}
        >
          登録
        </button>
      </div>
    </div>
  );
}

export default ShiftPeriod;