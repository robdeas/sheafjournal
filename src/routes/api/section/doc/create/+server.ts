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
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { KB_ROOT } from '$lib/server/db';

const PAGE_SIZE = 200; // max files per page folder
const SECTION_INFO_FILE = 'sheafbase-section-info.json';

export async function POST({ request }) {
    const { root, section } = await request.json() as { root: string; section: string };

    if (!root || !['Notes', 'Knowledge'].includes(root)) {
        return json({ error: 'Invalid root' }, { status: 400 });
    }
    if (!section) {
        return json({ error: 'Section required' }, { status: 400 });
    }

    const absSection = join(KB_ROOT, root, section);

    // Scaffold section info if needed
    const infoPath = join(absSection, SECTION_INFO_FILE);
    mkdirSync(absSection, { recursive: true });
    if (!existsSync(infoPath)) {
        writeFileSync(infoPath, JSON.stringify({
            displayName: section,
            description: '',
            tags: [],
            created: new Date().toISOString(),
        }, null, 2), 'utf8');
    }

    // Find the current page folder — use latest page that has room
    const pageDir = resolvePageDir(absSection);
    mkdirSync(pageDir, { recursive: true });

    // Generate timestamped filename
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const now = new Date();
    const filename = [
        'note',
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds()),
        pad(now.getMilliseconds(), 3),
    ].join('-') + '.md';

    const absPath = join(pageDir, filename);
    if (existsSync(absPath)) {
        return json({ error: 'File already exists' }, { status: 409 });
    }

    writeFileSync(absPath, '---\ntags: [quick-note]\n---\n\n', 'utf8');

    const relPath = '/' + absPath.replace(KB_ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
    return json({ ok: true, filename, path: relPath });
}

function resolvePageDir(absSection: string): string {
    let pageNum = 1;
    while (true) {
        const pageDir = join(absSection, `page${pageNum}`);
        if (!existsSync(pageDir)) return pageDir; // new page, empty
        const count = readdirSync(pageDir).length;
        if (count < PAGE_SIZE) return pageDir;    // room available
        pageNum++;
    }
}