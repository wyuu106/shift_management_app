// 管理者画面

import { useNavigate } from "react-router-dom";
import "../styles/menu.css"

function Admin() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>管理者メニュー</h1>

      <div
        className="menu-base"
        onClick={() => navigate("/shift/period")}
      >
        シフト期間管理
      </div>

      <div
        className="menu-base"
        onClick={() => navigate("/shift/register")}
      >
        シフト登録
      </div>

      <div
        className="menu-base"
        onClick={() => navigate("/shifts")}
      >
        シフト確認
      </div>

      <div
        className="menu-base"
        onClick={() => navigate("/users")}
      >
        ユーザー管理
      </div>

      <div
        className="menu-base"
        onClick={() => navigate("/user/requests")}
      >
        ユーザー登録申請
      </div>
    
    </div>
  );
}

export default Admin;