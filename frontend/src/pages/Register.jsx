// ユーザー登録ページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/form.css";
import "../styles/button.css";

function Register() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState();
  const [password, setPassword] = useState();

  // 登録申請
  const handleRegister = async() => {
    try{
      await axios.post(`${API_URL}/register/request`, {
        name: userName,
        password: password
      });

      alert("登録申請を送信しました。");
      navigate("/");
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">

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
            onClick={handleRegister}
          >
            申請する
          </button>

          <button
            className="button-base"
            onClick={() => navigate("/")}
          >
            ログイン画面へ戻る
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;