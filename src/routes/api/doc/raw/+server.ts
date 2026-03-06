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
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { KB_ROOT } from '$lib/server/db';
import { join } from 'path';
import { resolveKbPath } from '$lib/server/db';

const MIME: Record<string, string> = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.pdf':  'application/pdf',
  '.md':   'text/plain; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
};

export function GET({ url }) {
  const path = url.searchParams.get('path') ?? '';
  const absPath = resolveKbPath(path);
  if (!existsSync(absPath)) {
    return new Response('Not found', { status: 404 });
  }

  const ext = extname(absPath).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const isText = mime.startsWith('text/');

  const content = isText ? readFileSync(absPath, 'utf8') : readFileSync(absPath);

  return new Response(content, {
    headers: { 'Content-Type': mime }
  });
}
