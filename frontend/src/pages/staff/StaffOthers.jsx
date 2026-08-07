import { useNavigate } from "react-router-dom";

import PageHeader from "../../components/PageHeader";
import { clearSession } from "../../utils/api";

import "./staff.css";

function StaffOthers() {
  const navigate = useNavigate();

  const logout = () => {
    const shouldLogout = window.confirm("ログアウトしますか？");

    if (!shouldLogout) {
      return;
    }

    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="page">
      <PageHeader
        title="その他"
        description="アカウントやアプリに関するメニューです。"
      />

      <div className="menu-list card">
        <button
          className="menu-list__logout"
          onClick={logout}
        >
          <span className="menu-list__icon menu-list__icon--danger">↪</span>
          <span>
            <strong>ログアウト</strong>
            <small>ログイン画面へ戻る</small>
          </span>
          <b>›</b>
        </button>
      </div>
    </div>
  );
}

export default StaffOthers;
