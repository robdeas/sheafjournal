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
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { KB_ROOT } from '$lib/server/db';

const SECTION_INFO_FILE = 'sheafbase-section-info.json';
const VALID_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function POST({ request }) {
    const { root, name, displayName } = await request.json() as {
        root: string;
        name: string;
        displayName?: string;
    };

    if (!root || !['Notes', 'Knowledge'].includes(root)) {
        return json({ error: 'Invalid root' }, { status: 400 });
    }

    if (!name || !VALID_NAME.test(name)) {
        return json({ error: 'Section name must be lowercase letters, numbers and hyphens only' }, { status: 400 });
    }

    const absSection = join(KB_ROOT, root, name);

    if (existsSync(absSection)) {
        return json({ error: 'Section already exists' }, { status: 409 });
    }

    mkdirSync(absSection, { recursive: true });

    writeFileSync(join(absSection, SECTION_INFO_FILE), JSON.stringify({
        displayName: displayName?.trim() || name,
        description: '',
        tags: [],
        created: new Date().toISOString(),
    }, null, 2), 'utf8');

    return json({ ok: true, name });
}