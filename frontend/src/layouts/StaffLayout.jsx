// スタッフ画面のレイアウト

import { Outlet } from "react-router-dom";
import BottomNav from "../components/StaffBottomNav";

import "./layout.css";

function StaffLayout() {
  return (
    <div className="app-layout">
      <main className="app-content">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

export default StaffLayout;