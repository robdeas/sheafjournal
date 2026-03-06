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
import { buildTree } from '$lib/server/filesystem';
import { KB_ROOT } from '$lib/server/db';
import { join } from 'path';

export function GET({ url }) {
  const root = url.searchParams.get('root') ?? KB_ROOT;
  const absRoot = root.startsWith('/') || root.match(/^[A-Z]:/i)
    ? root
    : join(KB_ROOT, root);

  try {
    const tree = buildTree(absRoot);
    return json(tree);
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}
