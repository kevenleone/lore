// Display formatters. The prototype hard-coded labels like "2m" and
// "Today, 14:30"; here we derive them from an item's ISO `createdAt`.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Compact list-row label: "2m", "1h", "Yesterday", "3d", or a weekday. */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MINUTE))}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;

  const days = Math.floor(diff / DAY);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return WEEKDAYS[new Date(then).getDay()];
}

const HHMM = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Detail-pane "Saved" label: "Today, 14:30" / "Yesterday, 16:20" / "Mon, 17:10". */
export function formatSavedDate(iso: string, now: number = Date.now()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((startOfToday.getTime() - d.getTime()) / DAY);

  if (d.getTime() >= startOfToday.getTime()) return `Today, ${HHMM(d)}`;
  if (dayDiff < 1) return `Yesterday, ${HHMM(d)}`;
  if (dayDiff < 6) return `${WEEKDAYS[d.getDay()]}, ${HHMM(d)}`;
  return d.toLocaleDateString();
}
