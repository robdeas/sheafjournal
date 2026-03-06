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
  import { MONTHS } from '$lib/types';

  export let segments: { label: string; href: string }[];

  function format(label: string, index: number): string {
    if (index === 2 && /^\d{2}$/.test(label)) return MONTHS[label] ?? label;
    if (index === 3 && /^\d{1,2}$/.test(label)) {
      const n = parseInt(label);
      const s = [,'st','nd','rd'][n % 10] ?? 'th';
      return `${n}${s}`;
    }
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  $: crumbs = segments.map((s, i) => ({ ...s, display: format(s.label, i) }));
</script>

<header class="flex items-center gap-1.5 px-6 py-3 border-b border-ink-800/80 bg-ink-900/50 shrink-0">
  <a href="/" class="text-ink-500 hover:text-ink-300 transition-colors text-sm">⌂</a>
  {#each crumbs as crumb, i}
    <span class="text-ink-700 text-sm">/</span>
    {#if i === crumbs.length - 1}
      <span class="text-ink-200 text-sm font-medium">{crumb.display}</span>
    {:else}
      <a href={crumb.href} class="text-ink-400 hover:text-ink-200 transition-colors text-sm">
        {crumb.display}
      </a>
    {/if}
  {/each}
</header>
