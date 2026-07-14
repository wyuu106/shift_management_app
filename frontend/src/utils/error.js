export const getErrorMessage = (error) => {

  if (error.response) {

    return (
      error.response.data.detail ||
      "サーバーエラー"
    );
  }

  if (error.request) {
    return "サーバーに接続できません";
  }

  return "エラーが発生しました";
};