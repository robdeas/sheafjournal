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
import { getMeta, recordViewed } from '$lib/server/db';

export function GET({ url }) {
  const path = decodeURIComponent(url.searchParams.get('path') ?? '');
  return json(getMeta(path));
}

export async function POST({ url }) {
  const path = decodeURIComponent(url.searchParams.get('path') ?? '');
  recordViewed(path);
  return json({ ok: true });
}
