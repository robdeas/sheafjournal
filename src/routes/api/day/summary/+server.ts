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
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { KB_ROOT } from '$lib/server/db';
import { VIEW_FILE, INFO_FILE, TASKS_FILE } from '$lib/server/folderView';

const MD_EXTS = new Set(['.md', '.txt']);
const TASK_RE = /^- \[([ xX])\] (.+)$/gm;
const WORDS_PER_MINUTE = 200;

interface TaskItem {
    done: boolean;
    text: string;
    source: string;
}

interface FileMeta {
    name: string;
    ext: string;
    wordCount: number;
    readingMins: number;
    modifiedAt: string;
    sizeBytes: number;
}

export async function GET({ url }) {
    const path = url.searchParams.get('path');
    if (!path) return json({ error: 'path required' }, { status: 400 });

    const absDir = join(KB_ROOT, path.replace(/^\//, ''));

    if (!existsSync(absDir)) {
        return json({ tasks: [], files: [] });
    }

    const tasks: TaskItem[] = [];
    const files: FileMeta[] = [];

    // ── Scan tasks file first ─────────────────────────────────────────────
    const tasksPath = join(absDir, TASKS_FILE);
    if (existsSync(tasksPath)) {
        const text = readFileSync(tasksPath, 'utf8');
        let match;
        TASK_RE.lastIndex = 0;
        while ((match = TASK_RE.exec(text)) !== null) {
            const taskText = match[2].trim();
            if (!taskText) continue;
            tasks.push({
                done: match[1].toLowerCase() === 'x',
                text: taskText,
                source: TASKS_FILE,
            });
        }
    }

    // ── Scan note files for tasks + build files panel ─────────────────────
    const entries = readdirSync(absDir).filter(f =>
        f !== INFO_FILE && f !== VIEW_FILE && f !== TASKS_FILE
    );

    for (const name of entries.sort()) {
        const absPath = join(absDir, name);
        let stat;
        try { stat = statSync(absPath); } catch { continue; }
        if (!stat.isFile()) continue;

        const ext = extname(name).toLowerCase().replace('.', '');
        const modifiedAt = stat.mtime.toISOString();
        const sizeBytes = stat.size;
        let wordCount = 0;
        let readingMins = 0;

        if (MD_EXTS.has(extname(name).toLowerCase())) {
            try {
                const text = readFileSync(absPath, 'utf8');
                wordCount = text.trim().split(/\s+/).filter(Boolean).length;
                readingMins = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

                // Extract tasks from note files
                let match;
                TASK_RE.lastIndex = 0;
                while ((match = TASK_RE.exec(text)) !== null) {
                    const taskText = match[2].trim();
                    if (!taskText) continue;
                    tasks.push({
                        done: match[1].toLowerCase() === 'x',
                        text: taskText,
                        source: name,
                    });
                }
            } catch { /* skip unreadable */ }
        }

        files.push({ name, ext, wordCount, readingMins, modifiedAt, sizeBytes });
    }

    return json({ tasks, files });
}