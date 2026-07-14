import { BrowserRouter, Routes, Route } from "react-router-dom";

// 各ページのファイルをimport
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ログイン */}
        <Route
          path="/" // URL
          element={<Login />} // page関数
        />

        
      </Routes>
    </BrowserRouter>
  );
}

export default App
