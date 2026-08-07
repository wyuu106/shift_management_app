// 管理者画面のレイアウト

import { Outlet } from "react-router-dom";
import BottomNav from "../components/AdminBottomNav";

import "./layout.css";

function AdminLayout() {
  return (
    <div className="app-layout">
      <main className="app-content">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

export default AdminLayout;
