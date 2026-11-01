export const getErrorMessage = (error) => {
  if (error?.response) {
    const detail = error.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => item?.msg).filter((msg) => typeof msg === "string");
      return messages.join("\n") || "入力内容を確認してください";
    }
    if (typeof detail?.message === "string") return detail.message;
    return "サーバーエラー";
  }

  if (error?.request) {
    return "サーバーに接続できません";
  }

  return "エラーが発生しました";
};
