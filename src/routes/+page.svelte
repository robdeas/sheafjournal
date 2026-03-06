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

  $: tree = data.tree;

  function countFiles(node: FileNode): number {
    if (node.type === 'file') return 1;
    return (node.children ?? []).reduce((n, c) => n + countFiles(c), 0);
  }

  function recentDays(node: FileNode): { path: string; date: string; files: FileNode[] }[] {
    const days: { path: string; date: string; files: FileNode[] }[] = [];
    function walk(n: FileNode, depth: number) {
      if (depth === 4 && n.type === 'directory') {
        const parts = n.path.replace(/^\//, '').split('/');
        days.push({
          path: n.path,
          date: parts.join('-'),
          files: (n.children ?? []).filter(c => c.type === 'file'),
        });
      }
      (n.children ?? []).forEach(c => walk(c, depth + 1));
    }
    walk(node, 1);
    return days.slice(0, 6);
  }

  $: totalFiles = countFiles(tree);
  $: days = recentDays(tree);
</script>

<div class="px-10 py-10 max-w-4xl">
  <div class="mb-10">
    <h1 class="font-display font-light text-4xl text-ink-100 mb-2">Knowledge Base</h1>
    <p class="text-ink-400 text-sm">Your documents, bound together.</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4 mb-10">
    {#each [
      { label: 'Documents', value: totalFiles, icon: '◆' },
      { label: 'Folders',   value: (tree.children ?? []).length, icon: '◈' },
      { label: 'Years',     value: (tree.children ?? []).filter(c => c.type === 'directory').length, icon: '◉' },
    ] as stat}
      <div class="bg-ink-900 border border-ink-700/50 rounded-xl p-5">
        <div class="text-leaf-400 mb-3 text-lg">{stat.icon}</div>
        <div class="text-2xl font-light text-ink-100 font-display">{stat.value}</div>
        <div class="text-xs text-ink-500 mt-1 uppercase tracking-widest">{stat.label}</div>
      </div>
    {/each}
  </div>

  <!-- Recent entries -->
  {#if days.length > 0}
    <div class="mb-10">
      <h2 class="text-xs uppercase tracking-widest text-ink-500 mb-4">Recent Journal Entries</h2>
      <div class="grid grid-cols-2 gap-3">
        {#each days as day}
          <a href="/journal{day.path}"
             class="bg-ink-900 border border-ink-700/40 hover:border-ink-600 rounded-xl p-5
                    transition-all hover:bg-ink-800/80 group">
            <div class="font-mono text-sm text-ink-300 mb-3 group-hover:text-leaf-400 transition-colors">
              {day.date}
            </div>
            <div class="space-y-1">
              {#each day.files.slice(0, 3) as file}
                <div class="flex items-center gap-2 text-xs text-ink-500">
                  <span class={fileClass(file.ext)}>{fileIcon(file.ext)}</span>
                  {file.name}
                </div>
              {/each}
              {#if day.files.length > 3}
                <div class="text-xs text-ink-600">+{day.files.length - 3} more</div>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Year nav -->
  <div>
    <h2 class="text-xs uppercase tracking-widest text-ink-500 mb-4">Browse by Year</h2>
    <div class="flex gap-3 flex-wrap">
      {#each (tree.children ?? []).filter(c => c.type === 'directory') as yearNode}
        <a href="/journal/{yearNode.name}"
           class="bg-ink-900 border border-ink-700/40 hover:border-leaf-500/40
                  rounded-lg px-6 py-4 text-center transition-all hover:bg-ink-800/80 group">
          <div class="font-display text-2xl font-light text-ink-200 group-hover:text-leaf-400 transition-colors">
            {yearNode.name}
          </div>
          <div class="text-xs text-ink-500 mt-1">
            {(yearNode.children ?? []).length} months
          </div>
        </a>
      {/each}
    </div>
  </div>
</div>
