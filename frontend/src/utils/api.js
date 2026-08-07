import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

export const getValidSession = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !["staff", "admin"].includes(role)) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    const now = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp <= now || !payload.sub) return null;
    return { token, role };
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const session = getValidSession();
  if (session) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      if (window.location.pathname !== "/login")
        window.location.replace("/login");
    }
    return Promise.reject(error);
  },
);
