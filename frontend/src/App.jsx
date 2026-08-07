import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import StaffLayout from "./layouts/StaffLayout";
import AdminOthers from "./pages/admin/AdminOthers";
import AdminShifts from "./pages/admin/AdminShifts";
import ShiftPeriodPage from "./pages/admin/ShiftPeriodPage";
import UserRequestsPage from "./pages/admin/UserRequestsPage";
import UsersPage from "./pages/admin/UsersPage";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ShiftRequestPage from "./pages/staff/ShiftRequestPage";
import StaffOthers from "./pages/staff/StaffOthers";
import StaffShifts from "./pages/staff/StaffShifts";
import { clearSession, getValidSession } from "./utils/api";

function StartPage() {
  const session = getValidSession();

  if (!session) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={session.role === "admin" ? "/admin/shifts" : "/staff/shifts"}
      replace
    />
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<StartPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute role="staff" />}>
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<Navigate to="shifts" replace />} />
          <Route path="shifts" element={<StaffShifts />} />
          <Route path="shift/requests" element={<ShiftRequestPage />} />
          <Route path="others" element={<StaffOthers />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="shifts" replace />} />
          <Route path="shifts" element={<AdminShifts />} />
          <Route path="period" element={<ShiftPeriodPage />} />
          <Route path="others" element={<AdminOthers />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="user-requests" element={<UserRequestsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<StartPage />} />
    </>,
  ),
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
