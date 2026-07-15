import { BrowserRouter, Routes, Route } from "react-router-dom";

// 各ページのファイルをimport
import Login from "./pages/Login";
import Register from "./pages/Register";

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

        
      </Routes>
    </BrowserRouter>
  );
}

export default App
