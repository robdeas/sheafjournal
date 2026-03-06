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
import { existsSync, rmSync, readdirSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import { KB_ROOT } from '$lib/server/db';

export async function POST({ request }) {
    const { path } = await request.json() as { path: string };

    const absPath = join(KB_ROOT, path.replace(/^\//, ''));

    if (!existsSync(absPath)) {
        return json({ error: 'Folder not found' }, { status: 404 });
    }

    const resolved = absPath.replace(/\\/g, '/');
    const root = KB_ROOT.replace(/\\/g, '/');

    if (!resolved.startsWith(root)) {
        return json({ error: 'Path outside KB root' }, { status: 403 });
    }

    // Safety: must be at least 3 levels deep (Journal/YYYY/MM/DD)
    const relative = resolved.replace(root, '').replace(/^\//, '');
    const depth = relative.split('/').filter(Boolean).length;
    if (depth < 3) {
        return json({ error: 'Will not delete above day level' }, { status: 422 });
    }

    try {
        rmSync(absPath, { recursive: true, force: true });

        // Walk up and remove empty parent folders (month, year)
        let dir = dirname(absPath);
        while (dir.replace(/\\/g, '/') !== root) {
            try {
                const entries = readdirSync(dir);
                if (entries.length === 0) {
                    rmdirSync(dir);
                    dir = dirname(dir);
                } else {
                    break;
                }
            } catch {
                break;
            }
        }

        return json({ ok: true });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}