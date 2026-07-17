// シフト登録ページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/button.css"

function ShiftManagement() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [requests, setRequests] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [isCreated, setIsCreated] = useState(false);

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
        // 未作成なら希望取得
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

        // 初期状態は希望者全員選択
        setRequests(
          requestRes.data.map(day => ({
            shift_date: day.shift_date,
            members: day.members.map(member => ({
              ...member,
              checked: true,
            })),
          }))
        );
      }
    } catch(error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  // 希望者チェック変更
  const handleCheck = (
    shiftDate,
    userId
  ) => {
    setRequests(
      requests.map(day => {
        if(day.shift_date !== shiftDate){
          return day;
        }
        return {
          ...day,
          members: day.members.map(member =>
            member.user_id === userId
              ? {
                  ...member,
                  checked: !member.checked,
                }
              : member
          )
        };
      })
    );
  };

  // シフト確定
  const handleCreate = async () => {
    const data = requests.map(day => ({
      shift_date: day.shift_date,
      members: day.members
        .filter(member => member.checked)
        .map(member => ({
          user_id: member.user_id,
          user_name: member.user_name,
          remark: member.remark,
        }))
    }));

    try {
      await axios.put(
        `${API_URL}/shift`,
        data,
        {
          params:{
            start: period.start,
            end: period.end,
          },
          headers:{
            Authorization:
              `Bearer ${token}`,
          }
        }
      );

      alert("シフトを確定しました");
      init();

    } catch(error){
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  if(!period){
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
    )
  }

  // キャンセル処理
  const handleCancel = () => {
    if (!window.confirm("入力内容を破棄しますか？")) {
      return;
    }
    navigate("/admin");
  };

  return (
    <div>
      <h2>シフト管理</h2>

      <h3>{period.name}</h3>

      {
        isCreated ? (
          <>
            <h3>確定シフト</h3>
            {
              shifts.map(day => (
                <div key={day.shift_date}>
                  <h4>{day.shift_date}</h4>

                  {
                    day.members.map(member => (
                      <div key={member.user_id}>
                        {member.user_name}
                      </div>
                    ))
                  }
                </div>
              ))
            }
          </>
        ) : (
          <>
            <h3>希望者一覧</h3>

            {
              requests.map(day => (
                <div key={day.shift_date}>
                  <h4>{day.shift_date}</h4>

                  {
                    day.members.map(member => (
                      <div key={member.user_id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={member.checked}
                            onChange={() =>
                              handleCheck(
                                day.shift_date,
                                member.user_id
                              )
                            }
                          />
                          {member.user_name}
                        </label>

                        {
                          member.remark &&
                          <span>{member.remark}</span>
                        }
                      </div>
                    ))
                  }
                </div>
              ))
            }

            <div className="button-group">
              <button
                className="button-base"
                onClick={handleCancel}
              >
                キャンセル
              </button>

              <button
                className="button-base button-primary"
                onClick={handleCreate}
              >
                登録
              </button>
            </div>
          </>
        )
      }
    </div>
  );
}

export default ShiftManagement;