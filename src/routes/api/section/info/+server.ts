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
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { KB_ROOT } from '$lib/server/db';

const SECTION_INFO_FILE = 'sheafbase-section-info.json';

export async function GET({ url }) {
    const root = url.searchParams.get('root');
    const section = url.searchParams.get('section');
    if (!root || !section) return json({ error: 'root and section required' }, { status: 400 });
    if (!['Notes', 'Knowledge'].includes(root)) return json({ error: 'Invalid root' }, { status: 400 });

    const infoPath = join(KB_ROOT, root, section, SECTION_INFO_FILE);
    if (!existsSync(infoPath)) return json({ displayName: section, description: '', tags: [] });
    try {
        return json(JSON.parse(readFileSync(infoPath, 'utf8')));
    } catch {
        return json({ displayName: section, description: '', tags: [] });
    }
}

export async function POST({ request }) {
    const { root, section, displayName, description, tags } = await request.json() as {
        root: string; section: string; displayName: string; description: string; tags: string[];
    };
    if (!root || !section) return json({ error: 'root and section required' }, { status: 400 });
    if (!['Notes', 'Knowledge'].includes(root)) return json({ error: 'Invalid root' }, { status: 400 });

    const infoPath = join(KB_ROOT, root, section, SECTION_INFO_FILE);
    if (!existsSync(infoPath)) return json({ error: 'Section not found' }, { status: 404 });

    try {
        const existing = JSON.parse(readFileSync(infoPath, 'utf8'));
        writeFileSync(infoPath, JSON.stringify({
            ...existing,
            displayName: displayName ?? existing.displayName,
            description: description ?? existing.description,
            tags: tags ?? existing.tags,
        }, null, 2), 'utf8');
        return json({ ok: true });
    } catch {
        return json({ error: 'Failed to save' }, { status: 500 });
    }
}