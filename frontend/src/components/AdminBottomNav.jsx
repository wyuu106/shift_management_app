// 管理者画面下部のタブコンポーネント

import { NavLink } from "react-router-dom";

import "./bottomNav.css";

function AdminBottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink
        to="/admin/shifts"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        <span className="bottom-nav-icon">▦</span>
        シフト編集
      </NavLink>

      <NavLink
        to="/admin/period"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        <span className="bottom-nav-icon">◫</span>
        シフト期間
      </NavLink>

      <NavLink
        to="/admin/others"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        <span className="bottom-nav-icon">•••</span>
        その他
      </NavLink>
    </nav>
  );
}

export default AdminBottomNav;
