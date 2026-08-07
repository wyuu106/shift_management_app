import { useMemo } from "react";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ja } from "date-fns/locale";

import "./calender.css";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const toDateKey = (value) =>
  typeof value === "string" ? value.slice(0, 10) : format(value, "yyyy-MM-dd");

function Calender({ period, shifts = [], onDateSelect, selectedDate = "" }) {
  const calendarData = useMemo(() => {
    if (!period) return null;

    const periodStart = parseISO(period.start);
    const periodEnd = parseISO(period.end);
    const businessDateKeys = new Set(period.business_dates.map(toDateKey));
    const shiftsByDate = new Map(
      shifts.map((shift) => [toDateKey(shift.shift_date), shift.members ?? []]),
    );
    const months = eachMonthOfInterval({ start: periodStart, end: periodEnd });

    return { periodStart, periodEnd, businessDateKeys, shiftsByDate, months };
  }, [period, shifts]);

  if (!calendarData) return null;

  const { periodStart, periodEnd, businessDateKeys, shiftsByDate, months } =
    calendarData;

  return (
    <section className="shift-calendar" aria-label="シフトカレンダー">
      <header className="shift-calendar__header">
        <div>
          <h2>{period.name || "シフトカレンダー"}</h2>
        </div>
        <p className="shift-calendar__period">
          {format(periodStart, "M月d日", { locale: ja })}
          <span>〜</span>
          {format(periodEnd, "M月d日", { locale: ja })}
        </p>
      </header>

      <div className="shift-calendar__legend" aria-label="表示の説明">
        <span>
          <i className="legend-dot legend-dot--shift" />
          シフトあり
        </span>
        <span>
          <i className="legend-dot legend-dot--closed" />
          休業日
        </span>
      </div>

      <div className="shift-calendar__months">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const visibleStart = isBefore(periodStart, monthStart)
            ? monthStart
            : periodStart;
          const visibleEnd = isAfter(periodEnd, monthEnd)
            ? monthEnd
            : periodEnd;
          const leadingCells = getDay(visibleStart);
          const dates = eachDayOfInterval({
            start: visibleStart,
            end: visibleEnd,
          });

          return (
            <article className="calendar-month" key={format(month, "yyyy-MM")}>
              <h3>{format(month, "yyyy年 M月", { locale: ja })}</h3>
              <div
                className="calendar-grid calendar-grid--weekdays"
                aria-hidden="true"
              >
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {Array.from({ length: leadingCells }).map((_, index) => (
                  <span
                    className="calendar-day calendar-day--empty"
                    key={`empty-${index}`}
                  />
                ))}
                {dates.map((date) => {
                  const key = toDateKey(date);
                  const isBusinessDay = businessDateKeys.has(key);
                  const members = shiftsByDate.get(key) ?? [];
                  const dayOfWeek = getDay(date);
                  const classNames = [
                    "calendar-day",
                    onDateSelect && isBusinessDay
                      ? "calendar-day--clickable"
                      : "",
                    selectedDate === key ? "calendar-day--selected" : "",
                    !isBusinessDay ? "calendar-day--closed" : "",
                    dayOfWeek === 0 ? "calendar-day--sunday" : "",
                    dayOfWeek === 6 ? "calendar-day--saturday" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const content = (
                    <>
                      <time dateTime={key}>{format(date, "d")}</time>
                      {!isBusinessDay ? (
                        <strong className="calendar-day__closed">休</strong>
                      ) : members.length > 0 ? (
                        <ul className="calendar-day__members">
                          {members.map((member) => (
                            <li key={member.user_id}>
                              <span className="calendar-day__member-name">
                                {member.user_name}
                              </span>

                              {member.remark?.trim() && (
                                <span
                                  className="calendar-day__member-remark"
                                  title={member.remark}
                                >
                                  （{member.remark}）
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="calendar-day__empty-shift">未定</span>
                      )}
                    </>
                  );

                  if (onDateSelect && isBusinessDay) {
                    return (
                      <button
                        type="button"
                        className={classNames}
                        key={key}
                        onClick={() => onDateSelect(key)}
                        aria-label={`${format(date, "M月d日", { locale: ja })}のシフトを編集`}
                        aria-pressed={selectedDate === key}
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <div className={classNames} key={key}>
                      {content}
                    </div>
                  );
                })}
                {Array.from({
                  length: (7 - ((leadingCells + dates.length) % 7)) % 7,
                }).map((_, index) => (
                  <span
                    className="calendar-day calendar-day--empty"
                    key={`tail-${index}`}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default Calender;
