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
import { writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { KB_ROOT } from '$lib/server/db';
import { resolveKbPath } from '$lib/server/db';

const EDITABLE_EXTS = new Set(['.md', '.txt']);

export async function POST({ request }) {
  const { path, content } = await request.json() as { path: string; content: string };

  const absPath = resolveKbPath(path);


  // Safety checks
  if (!existsSync(absPath)) {
    return json({ error: 'File not found' }, { status: 404 });
  }

  const ext = extname(absPath).toLowerCase();
  if (!EDITABLE_EXTS.has(ext)) {
    return json({ error: `File type ${ext} is not editable` }, { status: 422 });
  }

  // Ensure path is inside KB_ROOT — prevent directory traversal
  const resolved = absPath.replace(/\\/g, '/');
  const root = KB_ROOT.replace(/\\/g, '/');
  if (!resolved.startsWith(root)) {
    return json({ error: 'Path outside KB root' }, { status: 403 });
  }

  try {
    writeFileSync(absPath, content, 'utf8');
    return json({ ok: true, savedAt: new Date().toISOString() });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}
