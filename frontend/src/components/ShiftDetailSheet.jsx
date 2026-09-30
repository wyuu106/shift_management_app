import { formatDate } from "../utils/date";

import "./shiftDetailSheet.css";

function ShiftDetailSheet({ date, members = [], onClose }) {
  if (!date) return null;

  return (
    <div
      className="shift-detail-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="shift-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-detail-title"
      >
        <header className="shift-detail-sheet__header">
          <div>
            <h2 id="shift-detail-title">{formatDate(date)}</h2>
            <span>{members.length}人が出勤</span>
          </div>

          <button
            type="button"
            className="shift-detail-sheet__close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <div className="shift-detail-sheet__body">
          {members.length === 0 ? (
            <p className="shift-detail-sheet__empty">シフトは未定です。</p>
          ) : (
            <ul className="shift-detail-list">
              {members.map((member) => (
                <li key={member.user_id}>
                  <span className="shift-detail-list__avatar" aria-hidden="true">
                    {member.user_name.slice(0, 1)}
                  </span>

                  <div>
                    <strong>{member.user_name}</strong>
                    {member.remark?.trim() && (
                      <small>（{member.remark}）</small>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shift-detail-sheet__footer">
          <button
            type="button"
            className="button button--block"
            onClick={onClose}
          >
            閉じる
          </button>
        </footer>
      </section>
    </div>
  );
}

export default ShiftDetailSheet;
