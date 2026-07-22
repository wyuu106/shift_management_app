// 日付ごとのシフト編集画面

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import { useShift } from "../contexts/ShiftContext";

import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";

import "../styles/button.css";

function AdminShiftEdit() {
  const navigate = useNavigate();

  const { target_date } = useParams();

  const { shifts, setShifts } = useShift();
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);

  const token = localStorage.getItem("token");

  // ユーザー一覧取得
  const fetchUsers = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUsers(res.data);
    
    } catch (error) {
      console.log(error);
      alert(getErrorMessage(error));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const dayShift = shifts.find(
      shift => shift.shift_date === target_date
    );

    if (dayShift) {
      setMembers(dayShift.members);
    }
  }, [shifts, target_date]);

  const handleCheck = (user) => {
    const exists = members.some(
      member => member.user_id === user.id
    );

    if (exists) {
      setMembers(
        members.filter(
          member => member.user_id !== user.id
        )
      );
    } else {
      setMembers([
        ...members,
        {
          user_id: user.id,
          user_name: user.name,
          remark: "",
        },
      ]);
    }
  };

  const handleRemarkChange = (userId, remark) => {
    setMembers(
      members.map(member =>
        member.user_id === userId
          ? {
              ...member,
              remark,
            }
          : member
      )
    );
  };

  const handleSave = () => {
    setShifts(
      shifts.map(day =>
        day.shift_date === target_date
          ? {
              ...day,
              members,
            }
          : day
      )
    );

    navigate("/admin/shift");
  };

  return (
    <div>
      <h2>{target_date}</h2>

      {users.map(user => {
        const member = members.find(
          m => m.user_id === user.id
        );

        return (
          <div key={user.id}>
            <label>
              <input
                type="checkbox"
                checked={!!member}
                onChange={() => handleCheck(user)}
              />

              {user.name}
            </label>

            {member && (
              <input
                type="text"
                placeholder="備考"
                value={member.remark}
                onChange={(e) =>
                  handleRemarkChange(
                    user.id,
                    e.target.value
                  )
                }
              />
            )}
          </div>
        );
      })}

      <div className="button-group">
        <button
          className="button-base"
          onClick={() => navigate("/admin/shift")}
        >
          キャンセル
        </button>

        <button
          className="button-base button-primary"
          onClick={handleSave}
        >
          保存
        </button>
      </div>
    </div>
  );
}

export default AdminShiftEdit;