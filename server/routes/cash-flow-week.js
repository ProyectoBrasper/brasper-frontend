// Cash-flow weeks of a month, exactly like the backend `CashFlowWeek`: weeks run Monday to Sunday, clipped to
// the month; week 1 ends on the first Sunday. Shared by the fake routes that schedule things in a week.
const MAX_WEEKS = 6;

/** Day of the month of the first Sunday (1..7). */
const firstSunday = (year, month) => {
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  return weekday === 0 ? 1 : 8 - weekday;
};

const daysIn = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Whether week `number` exists in that month. */
const weekExists = (year, month, number) => {
  if (!Number.isInteger(number) || number < 1 || number > MAX_WEEKS) return false;
  if (number === 1) return true;
  const start = firstSunday(year, month) + 1 + 7 * (number - 2);
  return start <= daysIn(year, month);
};

/** The week that contains a `yyyy-MM-dd` date: { year, month, week }. */
const weekOf = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const sunday = firstSunday(year, month);
  const week = day <= sunday ? 1 : 2 + Math.floor((day - sunday - 1) / 7);
  return { year, month, week };
};

const iso = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** The weeks of a month, in order: { year, month, number, startDate, endDate }. */
const weeksOf = (year, month) => {
  const sunday = firstSunday(year, month);
  const last = daysIn(year, month);
  const weeks = [];
  for (let number = 1; weekExists(year, month, number); number += 1) {
    const start = number === 1 ? 1 : sunday + 1 + 7 * (number - 2);
    const end = number === 1 ? sunday : Math.min(start + 6, last);
    weeks.push({ year, month, number, startDate: iso(year, month, start), endDate: iso(year, month, end) });
  }
  return weeks;
};

module.exports = { weekExists, weekOf, weeksOf };
