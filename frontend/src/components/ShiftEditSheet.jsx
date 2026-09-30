import { formatDate } from "../utils/date";

import "./shiftEditSheet.css";

function ShiftEditSheet({
  date,
  users,
  values = {},
  requestedMembers = [],
  onUpdateMember,
  onClose,
}) {
  if (!date) return null;

  const selectedCount = Object.values(values).filter(
    (item) => item.selected,
  ).length;

  const requestedUserIds = new Set(
    requestedMembers.map((member) => String(member.user_id)),
  );

  return (
    <div
      className="shift-sheet-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="shift-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-sheet-title"
      >
        <header className="shift-sheet__header">
          <div>
            <h2 id="shift-sheet-title">{formatDate(date)}</h2>
            <span>
              希望 {requestedMembers.length}人・選択 {selectedCount}人
            </span>
          </div>

          <button
            type="button"
            className="shift-sheet__close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <div className="shift-sheet__body">
          {users.length === 0 ? (
            <p className="muted">登録済みスタッフがいません。</p>
          ) : (
            users.map((user) => {
              const userId = String(user.id);
              const value = values[userId] || {
                selected: false,
                remark: "",
              };
              const requested = requestedUserIds.has(userId);

              return (
                <div
                  className={`member-row ${value.selected ? "member-row--selected" : ""}`}
                  key={user.id}
                >
                  <button
                    type="button"
                    className="member-row__toggle"
                    onClick={() =>
                      onUpdateMember(userId, {
                        selected: !value.selected,
                      })
                    }
                  >
                    <span className="member-row__check">
                      {value.selected ? "✓" : ""}
                    </span>

                    <span>
                      <strong>{user.name}</strong>
                      {requested && <small>希望あり</small>}
                    </span>
                  </button>

                  {value.selected && (
                    <input
                      className="input"
                      value={value.remark}
                      onChange={(event) =>
                        onUpdateMember(userId, {
                          remark: event.target.value,
                        })
                      }
                      placeholder="備考（時間帯など）"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="shift-sheet__footer">
          <button
            type="button"
            className="button button--block"
            onClick={onClose}
          >
            この日の編集を完了
          </button>
        </footer>
      </section>
    </div>
  );
}

export default ShiftEditSheet;
