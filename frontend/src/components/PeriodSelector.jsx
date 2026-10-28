import { useSearchParams } from "react-router-dom";
import { formatDate } from "../utils/date";

function PeriodSelector({ periods, period, disabled = false }) {
  const [, setSearchParams] = useSearchParams();

  return (
    <label className="field period-selector">
      <span>シフト期間</span>
      <select
        className="input"
        aria-label="シフト期間を選択"
        value={period?.id ?? ""}
        disabled={disabled || periods.length === 0}
        onChange={(event) => setSearchParams({ period_id: event.target.value })}
      >
        <option value="" disabled>
          {periods.length ? "期間を選択" : "選択可能な期間がありません"}
        </option>
        {periods.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name || "名称未設定"}
            （{formatDate(item.start, "yyyy/M/d")} 〜 {formatDate(item.end, "yyyy/M/d")}）
          </option>
        ))}
      </select>
    </label>
  );
}

export default PeriodSelector;
