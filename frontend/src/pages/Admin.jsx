// 管理者画面

import { useNavigate } from "react-router-dom";
import "../styles/menu.css"

function Admin() {
  const navigate = useNavigate();

  return (
    <div className="menu-base">
      <h1>管理者メニュー</h1>

      <div
        className="container"
        onClick={() => navigate("/shift/period")}
      >
        シフト期間管理
      </div>
    
    </div>
  );
}

export default Admin;