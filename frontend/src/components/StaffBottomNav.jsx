// メイン画面下部のタブコンポーネント

import { NavLink } from "react-router-dom";

import "./bottomNav.css";

function StaffBottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink
        to="/staff/shifts"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        シフト確認
      </NavLink>

      <NavLink
        to="/staff/shift/requests"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        シフト希望
      </NavLink>

      <NavLink
        to="/staff/others"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        その他
      </NavLink>
    </nav>
  );
}

export default StaffBottomNav;