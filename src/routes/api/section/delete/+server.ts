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
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { KB_ROOT } from '$lib/server/db';

export async function POST({ request }) {
    const { root, section } = await request.json() as { root: string; section: string };

    if (!root || !['Notes', 'Knowledge'].includes(root)) {
        return json({ error: 'Invalid root' }, { status: 400 });
    }
    if (!section) {
        return json({ error: 'Section required' }, { status: 400 });
    }

    const absSection = join(KB_ROOT, root, section);

    if (!existsSync(absSection)) {
        return json({ error: 'Section not found' }, { status: 404 });
    }

    try {
        rmSync(absSection, { recursive: true, force: true });
        return json({ ok: true });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}