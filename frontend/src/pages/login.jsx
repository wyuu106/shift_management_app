// ログインページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";

function Login() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [password, setPassword] = useState("");

  // ユーザー一覧取得
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get(`${API_URL}/users`);
      setUsers(res.data);
    };
    fetchUsers();
  }, []);

  const handleLogin = async () => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", selectedUsername);
      formData.append("password", password);

      const res = await axios.post(
        `${API_URL}/login`,
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role", res.data.role);
      
      // ユーザーデータのroleで遷移先変更
      navigate(res.data.role === "admin" ? "/admin" : "/staff");

    } catch (error) {
      console.log(error);
      alert(getErrorMessage(error));
    }
  };

  return (
    <div>
      <h1>ログイン</h1>

      {/* ユーザー選択 */}
      <select
        value={selectedUsername}
        onChange={(e) => {
          setSelectedUsername(e.target.value);
          setPassword(""); // ユーザー変えたらリセット
        }}
      >
        <option value="">ユーザーを選択</option>
        {users.map((u) => (
          <option key={u.id} value={u.name}>
            {u.name}
          </option>
        ))}
      </select>

      <br />

      {/* ユーザー選択でパスワード表示 */}
      {selectedUsername && (
        <>
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={handleLogin}>ログイン</button>
        </>
      )}

      <br />
      <br />

      <button onClick={() => navigate("/register")}>
        ユーザー登録申請へ
      </button>
    </div>
  );
}

export default Login;