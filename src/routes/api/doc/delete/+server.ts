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
import { unlinkSync, existsSync, rmSync, readdirSync } from 'fs';
import { extname, dirname, join } from 'path';
import { KB_ROOT } from '$lib/server/db';
import { VIEW_FILE, INFO_FILE } from '$lib/server/folderView';

const DELETABLE_EXTS = new Set(['.md', '.txt']);
const SYSTEM_FILES = new Set([VIEW_FILE, INFO_FILE]);

export async function POST({ request }) {
    const { path } = await request.json() as { path: string };

    const absPath = join(KB_ROOT, path.replace(/^\//, ''));

    if (!existsSync(absPath)) {
        return json({ error: 'File not found' }, { status: 404 });
    }

    const ext = extname(absPath).toLowerCase();
    if (!DELETABLE_EXTS.has(ext)) {
        return json({ error: `Deleting ${ext} files not supported` }, { status: 422 });
    }

    const resolved = absPath.replace(/\\/g, '/');
    const root = KB_ROOT.replace(/\\/g, '/');
    if (!resolved.startsWith(root)) {
        return json({ error: 'Path outside KB root' }, { status: 403 });
    }

    try {
        const absDir = dirname(absPath);
        unlinkSync(absPath);

        // Walk up and remove folders that contain only system files (or are empty)
        // rmSync with recursive handles removing system files + folder together
        let dir = absDir;
        while (dir.replace(/\\/g, '/') !== root) {
            const entries = readdirSync(dir).filter(f => !SYSTEM_FILES.has(f));
            if (entries.length === 0) {
                // Only system files remain (or folder is empty) — remove the whole folder
                rmSync(dir, { recursive: true, force: true });
                dir = dirname(dir);
            } else {
                break;
            }
        }

        return json({ ok: true });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}