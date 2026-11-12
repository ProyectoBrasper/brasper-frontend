/**
 * Conversions between the API's calendar dates (`yyyy-MM-dd`, no time zone) and local `Date`s.
 * Never use `toISOString()` for this: it converts to UTC and can move the date one day back.
 */

/** `Date` → `yyyy-MM-dd` using the local calendar date. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `yyyy-MM-dd` → local `Date` at midnight. Returns null for anything else. */
export function fromIsoDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 ? date : null;
}
