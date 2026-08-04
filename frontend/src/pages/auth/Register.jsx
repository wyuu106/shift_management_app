import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

import { API_URL } from "../../utils/api";
import { getErrorMessage } from "../../utils/error";

import "./auth.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: "",
    username: "",
    password: "",
    passwordConfirm: "",
  });

  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    if (
      !formData.id.trim() ||
      !formData.username.trim() ||
      formData.password === "" ||
      formData.passwordConfirm === ""
    ) {
      setErrorMessage("未入力の項目があります。");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setErrorMessage("パスワードが一致していません。");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/register`, {
          id: formData.id.trim(),
          username: formData.username.trim(),
          password: formData.password,
      });

      alert("登録が完了しました");
      navigate("/login");

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        <h2 className="auth-title">
          新規ユーザー登録
        </h2>

        <form
          className="auth-form"
          onSubmit={handleRegister}
        >

          <input
            type="text"
            name="id"
            placeholder="ID"
            value={formData.id}
            onChange={handleChange}
          />

          <input
            type="text"
            name="username"
            placeholder="ユーザーネーム"
            value={formData.username}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="パスワード"
            value={formData.password}
            onChange={handleChange}
          />

          <input
            type="password"
            name="passwordConfirm"
            placeholder="パスワード（確認用）"
            value={formData.passwordConfirm}
            onChange={handleChange}
          />

          {/* エラーメッセージ表示 */}
          {errorMessage && (
            <p className="auth-error">
              {errorMessage}
            </p>
          )}

          <button
            className="auth-button"
            type="submit"
          >
            登録
          </button>

        </form>

        <Link
          className="auth-link"
          to="/"
        >
          ログイン画面へ戻る
        </Link>
      </div>
    </div>
  );
}

export default Register;