import { Link, useNavigate } from "react-router-dom";

import PageHeader from "../../components/PageHeader";
import { clearSession } from "../../utils/api";

import "../staff/staff.css";

function AdminOthers() {
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
        description="スタッフのアカウントを管理できます。"
      />

      <div className="menu-list card">
        <Link to="/admin/users">
          <span className="menu-list__content">
            <strong>スタッフ管理</strong>
            <small>登録済みスタッフの確認・削除</small>
          </span>
          <b>›</b>
        </Link>

        <Link to="/admin/user-requests">
          <span className="menu-list__content">
            <strong>登録申請</strong>
            <small>新規アカウントを承認・却下</small>
          </span>
          <b>›</b>
        </Link>

        <button
          className="menu-list__logout"
          onClick={logout}
        >
          <span className="menu-list__content">
            <strong>ログアウト</strong>
            <small>ログイン画面へ戻る</small>
          </span>
          <b>›</b>
        </button>
      </div>
    </div>
  );
}

export default AdminOthers;
