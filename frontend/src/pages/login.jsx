// ログインページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/form.css";
import "../styles/button.css";

function Login() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");

  // ログイン
  const handleLogin = async () => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", userName);
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
    <div className="form-container">
      <div className="form-card">
        <h2>ログイン</h2>

        <input
          type="text"
          placeholder="ユーザー名"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="button-group">
          <button
            className="button-base button-primary"
            onClick={handleLogin}
          >
            ログイン
          </button>

          <button
            className="button-base"
            onClick={() => navigate("/register")}
          >
            ユーザー登録へ
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;