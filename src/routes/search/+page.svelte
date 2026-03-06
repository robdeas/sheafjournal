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
    import { fileIcon } from '$lib/types';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    interface SearchResult {
        path: string;
        href: string;
        section: string;
        filename: string;
        snippets: string[];
    }

    let q = '';
    let results: SearchResult[] = [];
    let loading = false;
    let searched = false;
    let lastQuery = '';

    onMount(() => {
        const urlQ = $page.url.searchParams.get('q') ?? '';
        if (urlQ) {
            q = urlQ;
            doSearch(urlQ);
        }
    });

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') search();
    }

    function search() {
        const term = q.trim();
        if (!term) return;
        goto(`/search?q=${encodeURIComponent(term)}`, { replaceState: true, noScroll: true });
        doSearch(term);
    }

    function isJournal(result: SearchResult): boolean {
        return result.path.startsWith('/Journal/');
    }

    function journalDate(result: SearchResult): string {
        const parts = result.path.replace(/^\//, '').split('/');
        return `${parts[1]}-${parts[2]}-${parts[3]}`;
    }

    function rootLabel(result: SearchResult): string {
        return result.path.replace(/^\//, '').split('/')[0];
    }

    async function doSearch(term: string) {
        loading = true;
        searched = true;
        lastQuery = term;
        results = [];
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
            const body = await res.json();
            results = body.results ?? [];
        } catch {
            results = [];
        } finally {
            loading = false;
        }
    }
</script>

<div class="px-10 py-10 max-w-3xl">
    <h1 class="font-display font-light text-3xl text-ink-100 mb-6">Search</h1>

    <div class="mb-8">
        <div class="flex gap-2">
            <input
                    bind:value={q}
                    onkeydown={handleKeydown}
                    type="text"
                    placeholder="Search notes… or tag:java"
                    class="flex-1 bg-ink-900 border border-ink-700 rounded-lg px-4 py-2.5
               text-ink-100 placeholder-ink-600 text-sm font-mono
               focus:outline-none focus:border-leaf-500/50 transition-colors"/>
            <button
                    onclick={search}
                    disabled={loading}
                    class="bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-300
               px-4 py-2.5 rounded-lg text-sm transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Searching…' : 'Search'}
            </button>
        </div>

        {#if loading}
            <div class="flex items-center gap-2 mt-3">
                <div class="flex gap-1">
                    {#each [0, 1, 2] as i}
                        <div class="w-1.5 h-1.5 bg-leaf-500 rounded-full animate-bounce"
                             style="animation-delay:{i * 0.15}s"></div>
                    {/each}
                </div>
                <span class="text-xs text-ink-500 font-mono">searching files…</span>
            </div>
        {:else if searched}
            <p class="text-xs text-ink-500 mt-2 font-mono">
                {results.length} result{results.length !== 1 ? 's' : ''} for
                <span class="text-leaf-400">"{lastQuery}"</span>
            </p>
        {/if}
    </div>

    <div class="space-y-2">
        {#if !loading}
            {#each results as result}
                <a href={result.href}
                   class="block bg-ink-900 border border-ink-700/40
                  hover:border-ink-600 rounded-xl px-5 py-4 transition-all
                  hover:bg-ink-800/60 group">
                    <div class="flex-1 min-w-0">
                        <!-- Primary: date or root/section -->
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="text-sm font-mono font-medium
                                         {isJournal(result) ? 'text-leaf-400' : 'text-ink-200'}">
                                {isJournal(result) ? journalDate(result) : result.section}
                            </span>
                            {#if !isJournal(result)}
                                <span class="text-xs text-ink-300 font-mono px-1.5 py-0.5 bg-ink-800 rounded">
                                    {rootLabel(result)}
                                </span>
                            {/if}
                        </div>
                        <!-- Snippets -->
                        {#if result.snippets.length > 0}
                            <div class="space-y-0.5 mb-1.5">
                                {#each result.snippets as snippet}
                                    <p class="text-sm text-ink-300 truncate group-hover:text-ink-100 transition-colors">…{snippet}…</p>
                                {/each}
                            </div>
                        {/if}
                        <!-- Filename small at bottom -->
                        <p class="text-xs text-ink-400 font-mono truncate">{result.filename}</p>
                    </div>
                </a>
            {/each}

            {#if searched && results.length === 0}
                <div class="text-center py-12 text-ink-600">
                    <div class="text-3xl mb-3">◇</div>
                    <p class="text-sm">No results for "{lastQuery}"</p>
                    <p class="text-xs mt-2 text-ink-300 font-mono">Try a different term or tag:yourterm</p>
                </div>
            {/if}

            {#if !searched}
                <div class="text-center py-12 text-ink-600">
                    <div class="text-3xl mb-3 text-leaf-500/20">⊙</div>
                    <p class="text-sm text-ink-300">Search across all journal entries, notes and knowledge.</p>
                    <p class="text-xs mt-2 text-ink-300 font-mono">Use tag:name to filter by tag</p>
                </div>
            {/if}
        {/if}
    </div>
</div>