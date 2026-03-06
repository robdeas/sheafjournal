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
import { KB_ROOT } from '$lib/server/db';
import { watch } from 'fs';

export function GET({ url, request }) {
  const root = url.searchParams.get('root') ?? KB_ROOT;

  const stream = new ReadableStream({
    start(controller) {
      const watcher = watch(root, { recursive: true }, (event, filename) => {
        const data = `data: ${JSON.stringify({ event, filename })}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(data));
        } catch {
          // controller closed
        }
      });

      request.signal.addEventListener('abort', () => {
        watcher.close();
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
