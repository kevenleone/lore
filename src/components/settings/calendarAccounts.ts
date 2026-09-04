// The calendar accounts shown in the Calendar settings pane and in the calendar
// view's legend. They live apart from `panes.tsx` so the calendar does not pull
// the whole settings sheet in behind one list.

import type { Switches } from '../../store/types';

export interface CalendarAccount {
    color: string;
    key: keyof Switches;
    meta: string;
    name: string;
}

export const CALENDAR_ACCOUNTS: CalendarAccount[] = [
    {
        color: '#8a92b8',
        key: 'calWork',
        meta: 'rowan@shaw.studio · 4 calendars',
        name: 'Work — Google',
    },
    {
        color: '#a88f6e',
        key: 'calPersonal',
        meta: 'rowan@icloud.com · 2 calendars',
        name: 'Personal — iCloud',
    },
    { color: '#82a896', key: 'calShared', meta: 'Read-only invite', name: 'Studio shared' },
];
