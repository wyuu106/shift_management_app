import { Navigate, Outlet } from "react-router-dom";
import { clearSession, getValidSession } from "../utils/api";

function ProtectedRoute({ role }) {
  const session = getValidSession();

  if (!session) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  if (role && session.role !== role) {
    return (
      <Navigate
        to={session.role === "admin" ? "/admin/shifts" : "/staff/shifts"}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
