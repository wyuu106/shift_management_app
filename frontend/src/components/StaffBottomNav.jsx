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
        <span className="bottom-nav-icon">▦</span>
        シフト
      </NavLink>

      <NavLink
        to="/staff/shift/requests"
        className={({ isActive }) =>
          isActive ? "bottom-nav-item active" : "bottom-nav-item"
        }
      >
        <span className="bottom-nav-icon">✓</span>
        希望提出
      </NavLink>

      <NavLink
        to="/staff/others"
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

export default StaffBottomNav;
