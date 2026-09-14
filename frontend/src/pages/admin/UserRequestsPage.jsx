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

function UserRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api.get("/requests");

      setRequests(response.data);
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

  const processRequest = async (request, shouldApprove) => {
    setError("");

    if (
      !shouldApprove &&
      !window.confirm(`${request.name}さんの申請を却下しますか？`)
    ) {
      return;
    }

    try {
      if (shouldApprove) {
        await api.post(`/approve/request/${request.id}`);
      } else {
        await api.put(`/reject/request/${request.id}`);
      }

      setRequests((currentRequests) =>
        currentRequests.filter((item) => item.id !== request.id),
      );
      setMessage(
        `${request.name}さんの申請を${shouldApprove ? "承認" : "却下"}しました`,
      );
    } catch (processError) {
      setError(getErrorMessage(processError));
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="登録申請"
        description="新しく届いたスタッフのアカウント申請を確認できます。"
        action={<BackButton to="/admin/others" />}
      />

      {message && <Notice>{message}</Notice>}

      {error && status === "ready" && <Notice type="error">{error}</Notice>}

      {status === "loading" && <Loading />}

      {status === "error" && <ErrorMessage message={error} onRetry={load} />}

      {status === "ready" &&
        (requests.length === 0 ? (
          <Empty
            icon="✓"
            title="未処理の申請はありません"
          />
        ) : (
          <div className="approval-list">
            {requests.map((request) => (
              <article className="approval-card card" key={request.id}>
                <span className="avatar">{request.name.slice(0, 1)}</span>

                <div>
                  <strong>{request.name}</strong>
                  <small>申請ID #{request.id}</small>
                </div>

                <div className="approval-card__actions">
                  <button
                    className="button button--secondary button--small"
                    onClick={() => processRequest(request, false)}
                  >
                    却下
                  </button>

                  <button
                    className="button button--small"
                    onClick={() => processRequest(request, true)}
                  >
                    承認
                  </button>
                </div>
              </article>
            ))}
          </div>
        ))}
    </div>
  );
}

export default UserRequestsPage;
