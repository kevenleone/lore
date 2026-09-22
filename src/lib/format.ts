// Display formatters. The prototype hard-coded labels like "2m" and
// "Today, 14:30"; here we derive them from an item's ISO `createdAt`.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** File size for the Properties panel: "412 B", "6.5 KB", "1.2 MB". */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }

    return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Due-date label for a `YYYY-MM-DD` day: "Today", "Tomorrow", "Yesterday", a
 * weekday within the next week, else a locale date. `today` is passed in rather
 * than read from the clock so the caller can derive it once for a whole list.
 */
export function formatDueDay(day: string, today: string): string {
    if (day === today) {
        return 'Today';
    }

    const diff = Math.round((dayStart(day).getTime() - dayStart(today).getTime()) / DAY);

    if (diff === 1) {
        return 'Tomorrow';
    }

    if (diff === -1) {
        return 'Yesterday';
    }

    const date = dayStart(day);

    if (diff > 1 && diff < 7) {
        return WEEKDAYS[date.getDay()];
    }

    if (diff < -1 && diff > -7) {
        return `${WEEKDAYS[date.getDay()]}, ${-diff}d ago`;
    }

    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Compact list-row label: "2m", "1h", "Yesterday", "3d", or a weekday. */
export function formatRelative(iso: string, now: number = Date.now()): string {
    const then = new Date(iso).getTime();
    const diff = Math.max(0, now - then);

    if (diff < HOUR) {
        return `${Math.max(1, Math.floor(diff / MINUTE))}m`;
    }

    if (diff < DAY) {
        return `${Math.floor(diff / HOUR)}h`;
    }

    const days = Math.floor(diff / DAY);

    if (days === 1) {
        return 'Yesterday';
    }

    if (days < 7) {
        return `${days}d`;
    }

    return WEEKDAYS[new Date(then).getDay()];
}

/** Midnight local time on a `YYYY-MM-DD` day. */
function dayStart(day: string): Date {
    const [year, month, date] = day.split('-').map(Number);

    return new Date(year, month - 1, date);
}

const HHMM = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Detail-pane "Saved" label: "Today, 14:30" / "Yesterday, 16:20" / "Mon, 17:10". */
export function formatSavedDate(iso: string, now: number = Date.now()): string {
    const d = new Date(iso);
    const startOfToday = new Date(now);

    startOfToday.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor((startOfToday.getTime() - d.getTime()) / DAY);

    if (d.getTime() >= startOfToday.getTime()) {
        return `Today, ${HHMM(d)}`;
    }

    if (dayDiff < 1) {
        return `Yesterday, ${HHMM(d)}`;
    }

    if (dayDiff < 6) {
        return `${WEEKDAYS[d.getDay()]}, ${HHMM(d)}`;
    }

    return d.toLocaleDateString();
}
