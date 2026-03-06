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
import { findNode } from '$lib/server/filesystem';
import { KB_ROOT } from '$lib/server/db';
import { join } from 'path';
import { mkdirSync } from 'fs';

export function load({ params }) {
  const absPath = join(KB_ROOT, 'Journal', params.year, params.month, params.day);

  //mkdirSync(absPath, { recursive: true });

  const node = findNode(`/Journal/${params.year}/${params.month}/${params.day}`);

  return {
    node: {
      ...(node ?? {
        name: params.day,
        type: 'directory',
        path: `/Journal/${params.year}/${params.month}/${params.day}`,
        children: [],
      }),
      absPath,  // always set, always the correct absolute path
    },
    year: params.year,
    month: params.month,
    day: params.day,
  };
}