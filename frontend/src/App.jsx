import { BrowserRouter, Routes, Route } from "react-router-dom";

// 各ページのファイルをimport
import Login from "./pages/Login";
import Register from "./pages/Register";

import Admin from "./pages/Admin";
import ShiftPeriod from "./pages/ShiftPeriod";

import { ShiftProvider } from "./contexts/ShiftContext";
import AdminShift from "./pages/AdminShift";
import AdminShiftEdit from "./pages/AdminShiftEdit"

import User from "./pages/User";
import UserRequest from "./pages/UserRequest";

import Staff from "./pages/Staff";
import ShiftRequest from "./pages/ShiftRequest";
import Shift from "./pages/Shift"

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

        {/* シフト関連 */}
        <Route element={<ShiftProvider />}>
          <Route
            path="/admin/shift"
            element={<AdminShift />}
          />

          <Route
            path="/admin/shift/:target_date"
            element={<AdminShiftEdit />}
          />
        </Route>

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

        {/* シフト確認 */}
        <Route
          path="/shifts"
          element={<Shift />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App
