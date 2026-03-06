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
  $: ({ node, year } = data);
  $: months = node?.children ?? [];

  const allMonths = Object.entries(MONTHS);
</script>

<div class="px-10 py-10">
  <h1 class="font-display font-light text-3xl text-ink-100 mb-8">{year}</h1>

  <div class="grid grid-cols-4 gap-4">
    {#each allMonths as [num, name]}
      {@const monthNode = months.find(m => m.name === num)}
      {#if monthNode}
        <a href="/journal/{year}/{num}"
           class="bg-ink-900 border border-ink-700/40 hover:border-leaf-500/30
                  rounded-xl p-5 transition-all hover:bg-ink-800/60 group">
          <div class="text-xs font-mono text-ink-600 mb-1">{num}</div>
          <div class="font-display font-light text-lg text-ink-200
                      group-hover:text-leaf-400 transition-colors mb-3">{name}</div>
          <div class="text-xs text-ink-500">{(monthNode.children ?? []).length} entries</div>
          <div class="flex gap-0.5 mt-3">
            {#each monthNode.children ?? [] as _}
              <div class="h-1 flex-1 bg-leaf-500/30 rounded-full"></div>
            {/each}
          </div>
        </a>
      {:else}
        <a href="/journal/{year}/{num}"
           class="border border-ink-800/40 rounded-xl p-5 opacity-40
                  hover:opacity-70 hover:bg-ink-800/30 transition-all">
          <div class="text-xs font-mono text-ink-700 mb-1">{num}</div>
          <div class="font-display font-light text-lg text-ink-700">{name}</div>
          <div class="text-xs text-ink-700 mt-1">no entries</div>
        </a>
      {/if}
    {/each}
  </div>
</div>