import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

import { API_URL } from "../../utils/api";
import { getErrorMessage } from "../../utils/error";

import "./auth.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const loginData = new URLSearchParams();

      loginData.append(
        "username",
        formData.id
      );

      loginData.append(
        "password",
        formData.password
      );

      const response = await axios.post(
        `${API_URL}/login`,
        loginData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      localStorage.setItem(
        "token",
        response.data.access_token
      );

      console.log("login success", response.data);

      navigate("/send");

    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        <h2 className="auth-title">
          ログイン
        </h2>

        <form
          className="auth-form"
          onSubmit={handleLogin}
        >

          <input
            type="text"
            name="id"
            placeholder="ID"
            value={formData.id}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="パスワード"
            value={formData.password}
            onChange={handleChange}
          />

          <button
            className="auth-button"
            type="submit"
          >
            ログイン
          </button>

        </form>

        <Link
          className="auth-link"
          to="/register"
        >
          新規ユーザー登録はこちら
        </Link>

      </div>
    </div>
  );
}

export default Login;