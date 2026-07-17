// スタッフ画面

import { useNavigate } from "react-router-dom";
import "../styles/menu.css"

function Admin() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>スタッフメニュー</h1>

      <div
        className="menu-base"
        onClick={() => navigate("/shift/request")}
      >
        シフト申請
      </div>
    
    </div>
  );
}

export default Admin;