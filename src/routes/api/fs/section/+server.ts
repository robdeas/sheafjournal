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
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { KB_ROOT } from '$lib/server/db';
import { INFO_FILE } from '$lib/server/folderView';

const SECTION_INFO_FILE = 'sheafbase-section-info.json';
const PAGE_RE = /^page\d+$/;
const IGNORED_FILES = new Set([INFO_FILE, SECTION_INFO_FILE, '.DS_Store']);

export async function GET({ url }) {
    const root = url.searchParams.get('root');
    if (!root || !['Notes', 'Knowledge'].includes(root)) {
        return json({ error: 'Invalid root — must be Notes or Knowledge' }, { status: 400 });
    }

    const absRoot = join(KB_ROOT, root);

    if (!existsSync(absRoot)) {
        return json({ name: root, type: 'directory', path: `/${root}`, children: [] });
    }

    const children = buildSectionTree(absRoot, root);
    return json({ name: root, type: 'directory', path: `/${root}`, children });
}

function buildSectionTree(absRoot: string, root: string) {
    const sections: any[] = [];
    let entries: string[] = [];
    try { entries = readdirSync(absRoot).sort(); } catch { return sections; }

    for (const name of entries) {
        if (IGNORED_FILES.has(name) || name.startsWith('.')) continue;
        const absSection = join(absRoot, name);
        let stat;
        try { stat = statSync(absSection); } catch { continue; }
        if (!stat.isDirectory()) continue;

        const sectionPath = `/${root}/${name}`;
        const files = collectFiles(absSection, sectionPath);
        sections.push({ name, type: 'directory', path: sectionPath, children: files });
    }
    return sections;
}

function collectFiles(absSection: string, sectionPath: string) {
    const files: any[] = [];
    let entries: string[] = [];
    try { entries = readdirSync(absSection).sort(); } catch { return files; }

    for (const name of entries) {
        if (IGNORED_FILES.has(name) || name.startsWith('.')) continue;
        const absEntry = join(absSection, name);
        let stat;
        try { stat = statSync(absEntry); } catch { continue; }

        if (stat.isDirectory() && PAGE_RE.test(name)) {
            // Transparently flatten page folders
            const pageFiles = collectFiles(absEntry, `${sectionPath}/${name}`);
            files.push(...pageFiles);
        } else if (stat.isFile()) {
            const ext = name.split('.').pop() ?? '';
            files.push({ name, type: 'file', path: `${sectionPath}/${name}`, ext });
        }
    }
    return files;
}