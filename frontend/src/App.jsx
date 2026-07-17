import { BrowserRouter, Routes, Route } from "react-router-dom";

// 各ページのファイルをimport
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import ShiftPeriod from "./pages/ShiftPeriod";
import ShiftRegister from "./pages/ShiftRegister";

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

        {/* ユーザー登録 */}
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

        {/* シフト登録 */}
        <Route
          path="/shift/register"
          element={<ShiftRegister />}
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
