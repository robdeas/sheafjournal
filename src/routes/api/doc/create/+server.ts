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
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { KB_ROOT } from '$lib/server/db';
import { VIEW_FILE, INFO_FILE } from '$lib/server/folderView';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function scaffoldFolderView(absDir: string, year: string, month: string, day: string): void {
  const viewPath = join(absDir, VIEW_FILE);
  if (existsSync(viewPath)) return;

  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const dow = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[parseInt(month) - 1];

  writeFileSync(viewPath, `# ${dow}, ${monthName} ${parseInt(day)}, ${year}

## Summary

_Add a summary of the day here._

## Notes



`, 'utf8');
}

function scaffoldFolderInfo(absDir: string): void {
  const infoPath = join(absDir, INFO_FILE);
  if (existsSync(infoPath)) return;
  writeFileSync(infoPath, JSON.stringify({
    title: '',
    tags: [],
    pinned: VIEW_FILE,
    created: new Date().toISOString(),
  }, null, 2), 'utf8');
}

export async function POST({ request }) {
  const { dir, year, month, day } = await request.json() as {
    dir: string;
    year?: string;
    month?: string;
    day?: string;
  };

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

  const absDir = dir.startsWith('/') || dir.match(/^[A-Z]:/i)
      ? dir
      : join(KB_ROOT, dir.replace(/^\//, ''));

  const absPath = join(absDir, filename);
  const relPath = '/' + absPath.replace(KB_ROOT, '').replace(/\\/g, '/').replace(/^\//, '');

  try {
    mkdirSync(absDir, { recursive: true });

    if (existsSync(absPath)) {
      return json({ error: 'File already exists' }, { status: 409 });
    }

    const y = year ?? String(now.getFullYear());
    const m = month ?? pad(now.getMonth() + 1);
    const d = day ?? pad(now.getDate());
    scaffoldFolderView(absDir, y, m, d);
    scaffoldFolderInfo(absDir);

    writeFileSync(absPath, '---\ntags: [quick-note]\n---\n\n', 'utf8');

    return json({ ok: true, filename, path: relPath });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}