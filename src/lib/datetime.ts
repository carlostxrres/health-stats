// Converts the value of an <input type="datetime-local"> (local wall-clock
// time, no timezone info) into an ISO string with the browser's UTC offset
// attached — e.g. "2026-08-10T23:30:00+02:00". The API relies on that offset
// being present to recover the correct local calendar date.
export function localInputToIso(localValue: string): string {
  const withSeconds = localValue.length === 16 ? `${localValue}:00` : localValue;
  const date = new Date(localValue);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const offset = `${sign}${pad(Math.trunc(offsetMinutes / 60))}:${pad(offsetMinutes % 60)}`;
  return `${withSeconds}${offset}`;
}

// Default value for a datetime-local input: "now", in local time.
export function nowAsLocalInputValue(): string {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
