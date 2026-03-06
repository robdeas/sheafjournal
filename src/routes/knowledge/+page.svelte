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
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import type { FileNode } from '$lib/types';

    const root = 'Knowledge';

    interface SectionInfo {
        name: string;
        displayName: string;
        description: string;
        tags: string[];
        fileCount: number;
    }

    let sections: SectionInfo[] = [];
    let loading = true;

    let newName = '';
    let newDisplayName = '';
    let creating = false;
    let error = '';
    let showForm = false;

    const VALID_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    onMount(loadSections);

    async function loadSections() {
        loading = true;
        const res = await fetch(`/api/fs/section?root=${root}`);
        if (!res.ok) { loading = false; return; }
        const tree: FileNode = await res.json();

        sections = await Promise.all((tree.children ?? []).map(async (node) => {
            const infoRes = await fetch(`/api/section/info?root=${root}&section=${node.name}`);
            const info = infoRes.ok ? await infoRes.json() : {};
            const fileCount = (node.children ?? []).filter(c => c.type === 'file').length;
            return {
                name: node.name,
                displayName: info.displayName ?? node.name,
                description: info.description ?? '',
                tags: info.tags ?? [],
                fileCount,
            };
        }));
        loading = false;
    }

    async function createSection() {
        const name = newName.trim().toLowerCase();
        if (!name) return;
        if (!VALID_NAME.test(name)) {
            error = 'Lowercase letters, numbers and hyphens only';
            return;
        }
        creating = true;
        error = '';
        const res = await fetch('/api/section/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ root, name, displayName: newDisplayName.trim() || name }),
        });
        const body = await res.json();
        if (!res.ok) {
            error = body.error ?? 'Failed to create section';
            creating = false;
            return;
        }
        goto(`/${root.toLowerCase()}/${name}`);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') createSection();
        if (e.key === 'Escape') { showForm = false; error = ''; newName = ''; newDisplayName = ''; }
    }
</script>

<div class="px-10 py-10 max-w-4xl">
    <div class="mb-8 flex items-end justify-between">
        <div>
            <h1 class="font-display font-light text-4xl text-ink-100 mb-2">Knowledge</h1>
            <p class="text-ink-400 text-sm">Technology notes, how-tos, reference material.</p>
        </div>
        <button
                onclick={() => showForm = !showForm}
                class="flex items-center gap-2 px-4 py-2 rounded-lg border border-ink-700
             text-ink-300 hover:text-leaf-400 hover:border-leaf-500/50
             hover:bg-ink-800/60 transition-all text-sm">
            <span class="text-leaf-500">+</span>
            New Section
        </button>
    </div>

    {#if showForm}
        <div class="mb-8 bg-ink-900 border border-ink-700/60 rounded-xl p-6">
            <h2 class="text-sm text-ink-300 mb-4">New Section</h2>
            <div class="flex gap-3 mb-3">
                <div class="flex-1">
                    <label class="text-xs text-ink-500 mb-1 block font-mono">Folder name</label>
                    <input
                            type="text"
                            bind:value={newName}
                            onkeydown={handleKeydown}
                            placeholder="e.g. java-spring"
                            autofocus
                            class="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm
                   text-ink-200 font-mono placeholder-ink-600 focus:outline-none
                   focus:border-leaf-500 transition-colors"/>
                </div>
                <div class="flex-1">
                    <label class="text-xs text-ink-500 mb-1 block font-mono">Display name (optional)</label>
                    <input
                            type="text"
                            bind:value={newDisplayName}
                            onkeydown={handleKeydown}
                            placeholder="e.g. Java & Spring"
                            class="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm
                   text-ink-200 placeholder-ink-600 focus:outline-none
                   focus:border-leaf-500 transition-colors"/>
                </div>
            </div>
            {#if error}
                <p class="text-xs text-rose-400 mb-3">{error}</p>
            {/if}
            <div class="flex gap-2">
                <button
                        onclick={createSection}
                        disabled={creating || !newName.trim()}
                        class="px-4 py-2 rounded-lg text-sm bg-leaf-500/10 border border-leaf-500/40
                 text-leaf-400 hover:bg-leaf-500/20 transition-colors
                 disabled:opacity-40 disabled:cursor-not-allowed">
                    {creating ? 'Creating…' : 'Create Section'}
                </button>
                <button
                        onclick={() => { showForm = false; error = ''; newName = ''; newDisplayName = ''; }}
                        class="px-4 py-2 rounded-lg text-sm border border-ink-700 text-ink-400
                 hover:bg-ink-800 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    {/if}

    {#if loading}
        <div class="flex gap-2 mt-16 justify-center">
            {#each [0,1,2] as i}
                <div class="w-2 h-2 bg-leaf-500 rounded-full animate-bounce"
                     style="animation-delay:{i * 0.15}s"></div>
            {/each}
        </div>

    {:else if sections.length === 0}
        <div class="flex flex-col items-center justify-center py-24 text-ink-600">
            <span class="text-4xl mb-4 text-leaf-500/20">⊠</span>
            <p class="text-sm text-ink-500 mb-6">No sections yet. Create one to get started.</p>
            {#if !showForm}
                <button
                        onclick={() => showForm = true}
                        class="flex items-center gap-2 bg-ink-900 border border-ink-700/40
                 hover:border-leaf-500/50 hover:bg-ink-800/60 rounded-xl px-6 py-4
                 text-sm text-ink-300 hover:text-leaf-400 transition-all group">
                    <span class="text-xl text-leaf-500 group-hover:text-leaf-400">+</span>
                    Create a section
                </button>
            {/if}
        </div>

    {:else}
        <div class="grid grid-cols-2 gap-3">
            {#each sections as s}
                <a href="/{root.toLowerCase()}/{s.name}"
                   class="bg-ink-900 border border-ink-700/40 hover:border-ink-600
                  rounded-xl p-5 transition-all hover:bg-ink-800/80 group">
                    <div class="flex items-start justify-between mb-2">
            <span class="font-medium text-ink-200 group-hover:text-leaf-400 transition-colors">
              {s.displayName}
            </span>
                        <span class="text-xs text-ink-600 font-mono">{s.fileCount} notes</span>
                    </div>
                    {#if s.description}
                        <p class="text-xs text-ink-500 mb-3">{s.description}</p>
                    {/if}
                    {#if s.tags.length > 0}
                        <div class="flex gap-1 flex-wrap">
                            {#each s.tags as tag}
                <span class="text-xs px-2 py-0.5 bg-ink-800 rounded-full text-ink-500 font-mono">
                  {tag}
                </span>
                            {/each}
                        </div>
                    {/if}
                    <p class="text-xs text-ink-700 font-mono mt-3">{s.name}</p>
                </a>
            {/each}
        </div>
    {/if}
</div>