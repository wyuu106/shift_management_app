import { useCallback, useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import BackButton from "../../components/BackButton";
import {
  Empty,
  ErrorMessage,
  Loading,
  Notice,
} from "../../components/Feedback";
import { api } from "../../utils/api";
import { getErrorMessage } from "../../utils/error";

import "./admin.css";

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api.get("/users");

      setUsers(response.data);
      setStatus("ready");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const remove = async (user) => {
    if (!window.confirm(`${user.name}さんを削除しますか？`)) {
      return;
    }

    setError("");

    try {
      await api.delete(`/user/${user.id}`);

      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.id !== user.id),
      );
      setMessage(`${user.name}さんを削除しました`);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="スタッフ管理"
        action={<BackButton to="/admin/others" />}
      />

      {message && <Notice>{message}</Notice>}

      {error && status === "ready" && <Notice type="error">{error}</Notice>}

      {status === "loading" && <Loading />}

      {status === "error" && <ErrorMessage message={error} onRetry={load} />}

      {status === "ready" &&
        (users.length === 0 ? (
          <Empty title="スタッフがいません" />
        ) : (
          <div className="user-list card">
            {users.map((user) => (
              <div className="user-row" key={user.id}>
                <span className="avatar">{user.name.slice(0, 1)}</span>

                <div>
                  <strong>{user.name}</strong>
                  <small>ID: {user.id}</small>
                </div>

                <span
                  className={`badge ${
                    user.role === "admin" ? "badge--primary" : ""
                  }`}
                >
                  {user.role === "admin" ? "管理者" : "スタッフ"}
                </span>

                {user.role !== "admin" && (
                  <button
                    className="button button--danger button--small"
                    onClick={() => remove(user)}
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

export default UsersPage;
