export function Loading({ label = "読み込んでいます" }) {
  return (
    <div className="feedback-card" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function Empty({ icon = "○", title, description }) {
  return (
    <div className="feedback-card feedback-card--empty">
      <span className="feedback-card__icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="feedback-card feedback-card--error" role="alert">
      <strong>読み込みに失敗しました</strong>
      <p>{message}</p>
      {onRetry && (
        <button className="button button--secondary" onClick={onRetry}>
          もう一度試す
        </button>
      )}
    </div>
  );
}

export function Notice({ type = "success", children }) {
  if (!children) return null;
  return (
    <div className={`notice notice--${type}`} role="status">
      {children}
    </div>
  );
}

export function SuccessPopup({ message, onClose }) {
  if (!message) return null;

  return (
    <div
      className="success-popup-layer"
      role="dialog"
      aria-modal="true"
      aria-label="処理完了"
    >
      <div className="success-popup">
        <span className="success-popup__check" aria-hidden="true">
          ✓
        </span>

        <div className="success-popup__content">
          <strong>完了しました</strong>
          <p>{message}</p>
        </div>

        <button
          type="button"
          className="button button--success success-popup__button"
          onClick={onClose}
          autoFocus
        >
          戻る
        </button>
      </div>
    </div>
  );
}
