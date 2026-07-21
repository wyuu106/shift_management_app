// シフト申請ページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/button.css"

function ShiftRequest() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [businessDates, setBusinessDates] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    getPeriod();
  }, []);

  // シフト期間取得
  const getPeriod = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/period`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPeriod(res.data);

      setBusinessDates(
        res.data.business_dates.map((date) => ({
          date,
          selected: false,
          remark: "",
        }))
      );

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  // チェック変更
  const handleCheck = (date) => {
    setBusinessDates(
      businessDates.map((item) =>
        item.date === date
          ? {
              ...item,
              selected: !item.selected,
            }
          : item
      )
    );
  };

  // 備考変更
  const handleRemark = (date, remark) => {
    setBusinessDates(
      businessDates.map((item) =>
        item.date === date
          ? {
              ...item,
              remark,
            }
          : item
      )
    );
  };

  // 登録
  const handleSubmit = async () => {
    const requests = businessDates
      .filter((item) => item.selected)
      .map((item) => ({
        shift_date: item.date,
        remark: item.remark,
      }));


    if (requests.length === 0) {
      alert("希望日を1日以上選択してください");
      return;
    }

    try {
      await axios.put(
        `${API_URL}/shift/request`,
        requests,
        {
          params: {
            start: period.start,
            end: period.end,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("登録しました");
      navigate("/staff")

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  if (!period) {
    return <p>読み込み中...</p>;
  }

  // キャンセル処理
  const handleCancel = () => {
    if (!window.confirm("入力内容を破棄しますか？")) {
      return;
    }
    navigate("/staff");
  };

  return (
    <div>
      <h2>シフト希望登録</h2>

      <h3>{period.name}</h3>

      <div>
        {businessDates.map((item) => (
          <div key={item.date}>
            <label>
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() =>
                  handleCheck(item.date)
                }
              />
              {item.date}
            </label>

            <input
              type="text"
              placeholder="備考"
              value={item.remark}
              onChange={(e) =>
                handleRemark(
                  item.date,
                  e.target.value
                )
              }
            />
          </div>
        ))}
      </div>

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

export default ShiftRequest;