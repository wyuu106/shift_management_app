// ユーザーごとのシフト確認画面

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/button.css"

function UserShift() {
  const navigate = useNavigate();

  const [shift, setShift] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchUserShifts();
  }, []);

  const fetchUserShifts = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/user/shifts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setShift(res.data);

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  if (!shift) {
    return <p>読み込み中...</p>;
  }

  return (
    <div>
      <h2>シフト確認</h2>

      <button
        className="button-base"
        onClick={() => navigate("/staff")}
      >
        戻る
      </button>

      <br />
      <br />

      {shift.shift_dates.length === 0 ? (
        <div className="shift-card holiday">
          現在登録されているシフトはありません。
        </div>
      ) : (
        <div className="shift-list">
          {shift.shift_dates.map(item => (
            <div
              key={item.shift_date}
              className="shift-card"
            >
              <div className="shift-date">
                {format(
                  parseISO(item.shift_date),
                  "M月d日（E）",
                  { locale: ja }
                )}
              </div>

              <div className="member">
                {item.remark && (
                  <div className="remark">
                    （{item.remark}）
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserShift;