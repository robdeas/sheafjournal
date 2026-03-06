// Copyright 2026 Rob Deas
// SPDX-License-Identifier: GPL-3.0-or-later
//
// This file is part of SheafJournal.
//
// SheafJournal is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// SheafJournal is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with SheafJournal. If not, see <https://www.gnu.org/licenses/>.
import { json } from '@sveltejs/kit';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { KB_ROOT } from '$lib/server/db';

export async function POST({ request }) {
    const { filePath, text, done } = await request.json() as {
        filePath: string;  // path to the source .md file containing the task
        text: string;      // exact task text to find
        done: boolean;     // current state — we toggle it
    };

    const absPath = join(KB_ROOT, filePath.replace(/^\//, ''));

    if (!existsSync(absPath)) {
        return json({ error: 'File not found' }, { status: 404 });
    }

    const content = readFileSync(absPath, 'utf8');

    // Match the exact task line — current state determines what to look for
    const from = done ? `- [x] ${text}` : `- [ ] ${text}`;
    const to   = done ? `- [ ] ${text}` : `- [x] ${text}`;

    // Also handle capital X
    const fromAlt = done ? `- [X] ${text}` : `- [ ] ${text}`;

    if (!content.includes(from) && !content.includes(fromAlt)) {
        return json({ error: 'Task not found in file' }, { status: 404 });
    }

    const newContent = content.replace(from, to).replace(fromAlt, to);
    writeFileSync(absPath, newContent, 'utf8');

    return json({ ok: true });
}