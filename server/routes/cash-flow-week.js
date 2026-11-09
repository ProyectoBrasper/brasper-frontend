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

module.exports = { weekExists, weekOf };
