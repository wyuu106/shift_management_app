import { BrowserRouter, Routes, Route } from "react-router-dom";

// 各ページのファイルをimport
import Login from "./pages/Login";
import Register from "./pages/Register";
import Shift from "./pages/Shift"
import Admin from "./pages/Admin";
import ShiftPeriod from "./pages/ShiftPeriod";
import AdminShift from "./pages/AdminShift";
import User from "./pages/User";
import UserRequest from "./pages/UserRequest";

import Staff from "./pages/Staff";
import ShiftRequest from "./pages/ShiftRequest";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ログイン */}
        <Route
          path="/" // URL
          element={<Login />} // page関数
        />

        {/* ユーザー登録申請 */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* シフト確認 */}
        <Route
          path="/shifts"
          element={<Shift />}
        />

        {/* 管理者メニュー */}
        <Route
          path="/admin"
          element={<Admin />}
        />

        {/* シフト期間登録 */}
        <Route
          path="/shift/period"
          element={<ShiftPeriod />}
        />

        {/* シフト登録 */}
        <Route
          path="/shift/register"
          element={<AdminShift />}
        />

        {/* ユーザー管理 */}
        <Route
          path="/users"
          element={<User />}
        />

        {/* ユーザー登録申請管理 */}
        <Route
          path="/user/requests"
          element={<UserRequest />}
        />

        {/* スタッフメニュー */}
        <Route
          path="/staff"
          element={<Staff />}
        />

        {/* シフト申請 */}
        <Route
          path="/shift/request"
          element={<ShiftRequest />}
        />

        
      </Routes>
    </BrowserRouter>
  );
}

export default App
