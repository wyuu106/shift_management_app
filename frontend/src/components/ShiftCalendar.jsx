import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

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

      <div className="shift-list">
        {dates.map(date => {
          const shift = shifts.find(
            s => s.shift_date === date
          );

          const isBusinessDay =
            period.business_dates.includes(date);

          const displayDate = parseISO(date);

          return (
            <div
              key={date}
              className={`shift-card ${
                !isBusinessDay ? "holiday" : ""
              }`}
              onClick={() => {
                if (isBusinessDay) {
                  onCellClick?.(date);
                }
              }}
            >
              <div className="shift-date">
                {format(
                  displayDate,
                  "M月d日(E)",
                  {
                    locale: ja,
                  }
                )}
              </div>

              {!isBusinessDay ? (
                <div className="holiday-text">
                  休
                </div>
              ) : (
                shift?.members.map(member => (
                  <div
                    className="member"
                    key={member.user_id}
                  >
                    <div>
                      {member.user_name}
                    </div>

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