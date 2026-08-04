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
        シフト編集
      </NavLink>

      <NavLink
        to="/admin/shift/requests"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        シフト希望
      </NavLink>

      <NavLink
        to="/admin/others"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        その他
      </NavLink>
    </nav>
  );
}

export default AdminBottomNav;