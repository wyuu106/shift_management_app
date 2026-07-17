// ユーザー管理ページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/button.css"

function User() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);

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

  // ユーザー削除
  const deleteUser = async (id) => {
    const ok = window.confirm(
      "本当にユーザーを削除しますか？"
    )

    if (!ok) {
      return
    }

    try {
      await axios.delete(`${API_URL}/user/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchUsers();
    
    } catch (error) {
      console.log(error);
      alert(getErrorMessage(error));
    }
  };

  return (
    <div>
      <h2>ユーザー管理</h2>

      <button
        className="button-base"
        onClick={() => navigate("/admin")}
      >
        戻る
      </button>

      <table
        border="1"
        cellPadding="8"
        style={{
          margin: "0 auto",
          borderCollapse: "collapse",
          textAlign: "center",
        }}
      >
        <thead>
          <tr>
            <th>ユーザー名</th>
            <th>ロール</th>
            <th>操作</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>
                {user.role === "admin"
                  ? "管理者"
                  : user.role === "staff"
                  ? "スタッフ"
                  : user.role}
              </td>
              <td>
                <button
                  className="button-base button-danger"
                  onClick={() => deleteUser(user.id)}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default User;