function ConflictReload({ onReload }) {
  return (
    <button
      type="button"
      className="button button--secondary"
      onClick={() => {
        if (window.confirm("最新のデータを読み込みますか？\n（編集中の内容は破棄されます）")) {
          onReload();
        }
      }}
    >
      最新のデータを読み込む
    </button>
  );
}

export default ConflictReload;
