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
import { TASKS_FILE } from '$lib/server/folderView';

export async function POST({ request }) {
    const { dayPath, text } = await request.json() as { dayPath: string; text: string };

    if (!text?.trim()) return json({ error: 'Task text required' }, { status: 400 });

    const absDir = join(KB_ROOT, dayPath.replace(/^\//, ''));
    const tasksPath = join(absDir, TASKS_FILE);

    const existing = existsSync(tasksPath) ? readFileSync(tasksPath, 'utf8') : '';
    const taskLine = `- [ ] ${text.trim()}\n`;
    writeFileSync(tasksPath, existing.trimEnd() + '\n' + taskLine, 'utf8');

    return json({ ok: true });
}