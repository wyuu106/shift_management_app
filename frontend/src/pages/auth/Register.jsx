import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../utils/api";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setErrorMessage("");

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
      setIsSubmitting(true);
      await api.post("/register/request", {
        id: formData.id.trim(),
        name: formData.username.trim(),
        password: formData.password,
      });

      navigate("/login", {
        state: {
          message: "申請を送信しました。管理者の承認後にログインできます。",
        },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <img src="/logo.png" alt="" />
      </div>

      <div className="auth-container">
        <h2 className="auth-title">新規登録</h2>

        <br />

        <form className="auth-form" onSubmit={handleRegister}>
          <input
            type="text"
            name="id"
            placeholder="ID"
            value={formData.id}
            onChange={handleChange}
            autoComplete="username"
          />

          <input
            type="text"
            name="username"
            placeholder="ユーザーネーム"
            value={formData.username}
            onChange={handleChange}
            autoComplete="name"
          />

          <input
            type="password"
            name="password"
            placeholder="パスワード"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
          />

          <input
            type="password"
            name="passwordConfirm"
            placeholder="パスワード（確認用）"
            value={formData.passwordConfirm}
            onChange={handleChange}
            autoComplete="new-password"
          />

          {/* エラーメッセージ表示 */}
          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "送信中…" : "申請を送信"}
          </button>
        </form>

        <Link className="auth-link" to="/login">
          ログインへ戻る
        </Link>
      </div>
    </div>
  );
}

export default Register;
