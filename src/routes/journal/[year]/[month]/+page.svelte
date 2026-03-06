<!--
  Copyright 2026 Rob Deas
  SPDX-License-Identifier: GPL-3.0-or-later

  This file is part of SheafJournal.

  SheafJournal is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  SheafJournal is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with SheafJournal. If not, see <https://www.gnu.org/licenses/>.
-->
<script lang="ts">
  import type { PageData } from './$types';
  import { MONTHS, fileIcon, fileClass } from '$lib/types';
  import type { FileNode } from '$lib/types';

  export let data: PageData;
  $: ({ node, year, month } = data);

  $: entryDays = new Set((node.children ?? []).map((d: FileNode) => d.name.padStart(2, '0')));

  $: firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
  $: daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  $: today = new Date();
  $: isCurrentMonth = today.getFullYear() === parseInt(year) && today.getMonth() + 1 === parseInt(month);

  $: calendarCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function dayPad(d: number): string {
    return String(d).padStart(2, '0');
  }

  function cellClass(cell: number): string {
    const pad = dayPad(cell);
    const hasEntry = entryDays.has(pad);
    const isToday = isCurrentMonth && today.getDate() === cell;
    const base = 'aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative';
    if (isToday) return base + ' bg-leaf-500/20 text-leaf-400 border border-leaf-500/50';
    if (hasEntry) return base + ' bg-ink-800 text-ink-200 hover:bg-ink-700';
    return base + ' text-ink-600 hover:bg-ink-800/60 hover:text-ink-400';
  }
</script>

<div class="px-10 py-10">
  <h1 class="font-display font-light text-3xl text-ink-100 mb-1">
    {MONTHS[month] ?? month} {year}
  </h1>
  <p class="text-ink-500 text-sm mb-8">{entryDays.size} entries</p>

  <div class="max-w-md">
    <div class="grid grid-cols-7 mb-2">
      {#each ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as d}
        <div class="text-center text-xs text-ink-600 py-1">{d}</div>
      {/each}
    </div>

    <div class="grid grid-cols-7 gap-1">
      {#each calendarCells as cell}
        {#if cell === null}
          <div></div>
        {:else}
          <a href="/journal/{year}/{month}/{dayPad(cell)}" class={cellClass(cell)}>
            <span>{cell}</span>
            <span class="absolute bottom-1 w-1 h-1 rounded-full {entryDays.has(dayPad(cell)) ? 'bg-leaf-500' : 'bg-transparent'}"></span>
          </a>
        {/if}
      {/each}
    </div>
  </div>

  {#if (node.children ?? []).length > 0}
    <div class="mt-10">
      <h2 class="text-xs uppercase tracking-widest text-ink-500 mb-4">Entries</h2>
      <div class="space-y-2 max-w-xl">
        {#each node.children ?? [] as day}
          <a href="/journal/{year}/{month}/{day.name}"
             class="flex items-center gap-4 bg-ink-900 border border-ink-700/40 hover:border-ink-600 rounded-xl px-5 py-3 transition-all hover:bg-ink-800/60 group">
            <div class="font-mono text-sm text-ink-300 group-hover:text-leaf-400 transition-colors w-8">
              {day.name}
            </div>
            <div class="flex gap-3 flex-wrap">
              {#each (day.children ?? []).filter((c: FileNode) => c.type === 'file') as file}
                <div class="flex items-center gap-1.5 text-xs">
                  <span class={fileClass(file.ext)}>{fileIcon(file.ext)}</span>
                  <span class="text-ink-400">{file.name}</span>
                </div>
              {/each}
            </div>
            <div class="ml-auto text-xs text-ink-600">
              {(day.children ?? []).filter((c: FileNode) => c.type === 'file').length} files
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>