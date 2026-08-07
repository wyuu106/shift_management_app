import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api } from "../../utils/api";
import { getErrorMessage } from "../../utils/error";

import "./auth.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    id: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const loginData = new URLSearchParams();

      loginData.append("username", formData.id);

      loginData.append("password", formData.password);

      const response = await api.post("/login", loginData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("role", response.data.role);
      navigate(
        response.data.role === "admin" ? "/admin/shifts" : "/staff/shifts",
      );
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
        <h2 className="auth-title">ログイン</h2>

        <br />

        {location.state?.message && (
          <p className="auth-success">{location.state.message}</p>
        )}

        <form className="auth-form" onSubmit={handleLogin}>
          <input
            type="text"
            name="id"
            placeholder="ID"
            value={formData.id}
            onChange={handleChange}
            autoComplete="username"
            aria-label="ログインID"
          />

          <input
            type="password"
            name="password"
            placeholder="パスワード"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            aria-label="パスワード"
          />

          {errorMessage && (
            <p className="auth-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中…" : "ログイン"}
          </button>
        </form>

        <Link className="auth-link" to="/register">
          新規登録はこちら
        </Link>
      </div>
    </div>
  );
}

export default Login;
