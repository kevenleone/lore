// The templates Lore ships with.
//
// They exist so ⌘K has something useful in it on day one, in a vault where
// nobody has written a template yet. They are ordinary `Template` values rather
// than files: writing six notes into someone's vault uninvited is the same
// hostility the seeded sample notes already refuse.
//
// None of them names a collection. A built-in cannot know which folders a vault
// has, and filing into one that does not exist would create it — so they land
// wherever the vault puts an uncollected note, and a copy in
// `.lore/templates/` is where a `collection:` belongs.

import type { Template } from '../store/types';

export const BUILTIN_TEMPLATES: Template[] = [
    {
        body: ['## Today', '', '## Notes', '', '## Tomorrow', ''].join('\n'),
        name: 'Daily',
        tags: ['journal'],
        type: 'note',
    },
    {
        body: [
            '**When** {{date}} {{time}}',
            '**Who**',
            '',
            '## Agenda',
            '',
            '## Notes',
            '',
            '## Actions',
            '',
            '- [ ] ',
            '',
        ].join('\n'),
        name: 'Meeting',
        tags: ['meeting'],
        title: 'Meeting {{date}}',
        type: 'note',
    },
    {
        body: [
            '## What shipped',
            '',
            '## What slipped, and why',
            '',
            '## What I learned',
            '',
            '## Next week',
            '',
        ].join('\n'),
        name: 'Weekly Review',
        tags: ['review'],
        title: 'Week of {{date}}',
        type: 'note',
    },
    {
        body: [
            '**Author**',
            '**Finished**',
            '',
            '## Why I picked it up',
            '',
            '## Notes',
            '',
            '## What I want to keep',
            '',
        ].join('\n'),
        name: 'Book',
        tags: ['book'],
        type: 'note',
    },
    {
        body: [
            '**Decided** {{date}}',
            '**Status** proposed',
            '',
            '## Context',
            '',
            '## Options considered',
            '',
            '## Decision',
            '',
            '## What this costs us',
            '',
        ].join('\n'),
        name: 'Decision',
        tags: ['decision'],
        type: 'note',
    },
    {
        body: [
            '## Goal',
            '',
            '## Out of scope',
            '',
            '## Milestones',
            '',
            '- [ ] ',
            '',
            '## Open questions',
            '',
        ].join('\n'),
        name: 'Project',
        tags: ['project'],
        type: 'note',
    },
];
