// ユーザー登録申請に関するページ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../utils/api";
import { getErrorMessage } from "../utils/error";
import "../styles/button.css"

function UserRequest() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);

  const token = localStorage.getItem("token");

  // 申請一覧取得
  const getRequests = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/requests`,
        {
          headers: {
          Authorization: `Bearer ${token}`,
          },
        }
      );
  
      setRequests(response.data);

    } catch (error) {
      console.log(error);
      alert(getErrorMessage(error));
    }
  };
    
    // 画面が最初に表示された時にgetRequestsを実行
    useEffect(() => {
      getRequests();
    }, []);

  // 申請許可
  const approveRequest = async (id) => {
    const ok = window.confirm(
      "本当に申請を許可しますか？"
    )

    if (!ok) {
      return
    }

    try{
      await axios.post(
        `${API_URL}/approve/request/${id}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      getRequests();

    } catch (error) {
      console.log(error);
      alert(getErrorMessage(error));
    }
  };

  // 申請却下
  const rejectRequest = async (id) => {
    const ok = window.confirm(
      "本当に申請を却下しますか？"
    )

    if (!ok) {
      return
    }

    try{
      await axios.put(
        `${API_URL}/reject/request/${id}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      getRequests();

    } catch (error) {
      console.log(error);
      alert(getErrorMessage(error));
    }
  };

  return (
    <div>
      <h2>ユーザー登録申請一覧</h2>

      <button
        className="button-base"
        onClick={() => navigate("/admin")}
      >
        戻る
      </button>

      {requests.length === 0 ? (
        <p>申請はありません</p>
      ) : (
        requests.map((request) => (
          <div
            key={request.id}
            style={{
              border: "1px solid black",
              padding: "10px",
              marginBottom: "10px",
              maxWidth: "400px",
              margin: "0 auto 10px",
            }}
          >
            <p>ユーザー名: {request.name}</p>

            <button
              className="button-base button-primary"
              onClick={() => approveRequest(request.id)}
            >
              許可
            </button>

            <button
              className="button-base button-danger"
              onClick={() => rejectRequest(request.id)}
              style={{ marginLeft: "10px" }}
            >
              却下
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default UserRequest;