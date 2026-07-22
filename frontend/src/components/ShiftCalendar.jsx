// シフトカレンダーの表示コンポーネント

import "../styles/shift.css";

function ShiftCalendar({
  period,
  dates,
  shifts,
  onCellClick,
}) {
  return (
    <>
      <h2>{period.name}</h2>

      <div className="shift-header">
        {[
          "月",
          "火",
          "水",
          "木",
          "金",
          "土",
          "日",
        ].map(day => (
          <div key={day}>
            {day}
          </div>
        ))}
      </div>

      <div className="shift-grid">
        {dates.map(date => {
          const shift = shifts.find(
            s => s.shift_date === date
          );

          const isBusinessDay =
            period.business_dates.includes(date);

          return (
            <div
              key={date}
              className={`shift-cell ${
                !isBusinessDay ? "holiday" : ""
              }`}
              onClick={() => {
                if (isBusinessDay) {
                  onCellClick?.(date);
                }
              }}
              style={{
                cursor: isBusinessDay
                  ? "pointer"
                  : "default",
              }}
            >
              <div className="shift-date">
                {date.slice(5)}
              </div>

              {!isBusinessDay ? (
                <div className="remark">
                  休
                </div>
              ) : (
                shift?.members.map(member => (
                  <div
                    className="member"
                    key={member.user_id}
                  >
                    <div>{member.user_name}</div>

                    {member.remark && (
                      <div className="remark">
                        （{member.remark}）
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default ShiftCalendar;