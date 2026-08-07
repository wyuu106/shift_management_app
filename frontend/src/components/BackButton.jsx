import { Link } from "react-router-dom";

function BackButton({ to }) {
  return (
    <Link
      className="button button--secondary back-button"
      to={to}
    >
      戻る
    </Link>
  );
}

export default BackButton;
