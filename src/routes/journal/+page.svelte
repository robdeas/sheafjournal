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
  import { MONTHS } from '$lib/types';

  export let data: PageData;
  $: years = (data.node?.children ?? []).map((c: any) => parseInt(c.name)).filter((n: number) => !isNaN(n)).sort((a: number, b: number) => b - a);

  const thisYear = new Date().getFullYear();
  const now = new Date();

  const PAGE_SIZE = 8;
  let page = 0;

  $: oldestEntry = years.length > 0 ? Math.min(...years) : thisYear - 5;
  $: rangeStart = Math.min(oldestEntry, thisYear - 5);
  $: rangeEnd = thisYear + 2;
  $: allYears = Array.from(
          { length: rangeEnd - rangeStart + 1 },
          (_, i) => rangeEnd - i
  );
  $: totalPages = Math.ceil(allYears.length / PAGE_SIZE);
  $: pageYears = allYears.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  $: {
    const idx = allYears.indexOf(thisYear);
    if (idx >= 0) page = Math.floor(idx / PAGE_SIZE);
  }

  $: todayPath = `/journal/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
</script>

<div class="px-10 py-10">
  <h1 class="font-display font-light text-3xl text-ink-100 mb-2">Journal</h1>
  <p class="text-ink-500 text-sm mb-10">Your knowledge base, day by day.</p>

  <!-- Quick jump to today -->
  <div class="mb-10">
    <h2 class="text-xs uppercase tracking-widest text-ink-500 mb-4">Quick Jump</h2>
    <a href={todayPath}
       class="inline-flex items-center gap-2 bg-ink-900 border border-ink-700/40
              hover:border-leaf-500/40 rounded-xl px-5 py-3 text-sm transition-all
              hover:bg-ink-800/60 group">
      <span class="text-leaf-400">◈</span>
      <span class="text-ink-300 group-hover:text-leaf-400 transition-colors">Today</span>
      <span class="text-ink-600 font-mono text-xs ml-2">
        {now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, '0')}-{String(now.getDate()).padStart(2, '0')}
      </span>
    </a>
  </div>

  <!-- Year picker -->
  <div class="mb-10">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xs uppercase tracking-widest text-ink-500">Year</h2>
      {#if totalPages > 1}
        <div class="flex items-center gap-2">
          <button
                  on:click={() => page = Math.max(0, page - 1)}
                  disabled={page === 0}
                  class="px-2 py-1 text-xs text-ink-500 hover:text-ink-300
                   disabled:opacity-30 transition-colors">
            ← newer
          </button>
          <span class="text-xs text-ink-700 font-mono">{page + 1}/{totalPages}</span>
          <button
                  on:click={() => page = Math.min(totalPages - 1, page + 1)}
                  disabled={page === totalPages - 1}
                  class="px-2 py-1 text-xs text-ink-500 hover:text-ink-300
                   disabled:opacity-30 transition-colors">
            older →
          </button>
        </div>
      {/if}
    </div>

    <div class="flex flex-wrap gap-2">
      {#each pageYears as y}
        {@const hasEntries = years.includes(y)}
        {@const isThisYear = y === thisYear}
        {@const yearNode = (data.node?.children ?? []).find((c: any) => c.name === String(y))}
        <a href="/journal/{y}"
           class="px-5 py-3 rounded-xl text-sm font-mono transition-all border
                  {isThisYear
                    ? 'bg-leaf-500/10 border-leaf-500/40 text-leaf-400 hover:bg-leaf-500/20'
                    : hasEntries
                      ? 'bg-ink-900 border-ink-700/60 text-ink-200 hover:bg-ink-800 hover:border-ink-600'
                      : 'bg-transparent border-ink-800/40 text-ink-700 hover:bg-ink-900/50 hover:text-ink-500'}">
          {y}
          {#if hasEntries}
            <span class="ml-2 text-xs text-ink-600">{yearNode?.children?.length ?? 0}mo</span>
          {/if}
        </a>
      {/each}
    </div>
  </div>

  <!-- Years with entries -->
  {#if years.length > 0}
    <div>
      <h2 class="text-xs uppercase tracking-widest text-ink-500 mb-4">Years with Entries</h2>
      <div class="grid grid-cols-2 gap-4 max-w-xl">
        {#each years as y}
          {@const yearNode = (data.node?.children ?? []).find((c: any) => c.name === String(y))}
          <a href="/journal/{y}"
             class="bg-ink-900 border border-ink-700/40 hover:border-ink-600
                    rounded-xl p-5 transition-all hover:bg-ink-800/60 group">
            <div class="font-display text-4xl font-light text-ink-700
                        group-hover:text-ink-600 transition-colors mb-3 leading-none">
              {y}
            </div>
            <div class="flex flex-wrap gap-1.5">
              {#each yearNode?.children ?? [] as month}
                <span class="text-xs bg-ink-800 text-ink-400 px-2 py-0.5 rounded font-mono">
                  {MONTHS[month.name]?.slice(0, 3) ?? month.name}
                </span>
              {/each}
            </div>
            <div class="mt-3 text-xs text-ink-500">
              {yearNode?.children?.length ?? 0} months
            </div>
          </a>
        {/each}
      </div>
    </div>
  {:else}
    <div class="text-center py-16 text-ink-600">
      <div class="text-4xl mb-3">◈</div>
      <p class="text-sm">No journal entries yet.</p>
      <p class="text-xs mt-2 font-mono text-ink-700">Click Today above to get started.</p>
    </div>
  {/if}
</div>