<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { MONTHS } from '$lib/types';
  import type { FileNode } from '$lib/types';

  let tree: FileNode | null = null;
  let notesTree: FileNode | null = null;
  let knowledgeTree: FileNode | null = null;
  let expanded: Set<string> = new Set();

  // New section inline input state
  let addingSection: 'Notes' | 'Knowledge' | null = null;
  let newSectionName = '';
  let newSectionError = '';

  onMount(async () => {
    const res = await fetch('/api/fs/tree');
    tree = await res.json();
    const year = new Date().getFullYear().toString();
    expanded.add(`/Journal/${year}`);
    expanded = new Set(expanded);
    await loadSectionTrees();
  });

  async function loadSectionTrees() {
    const [notesRes, knowledgeRes] = await Promise.all([
      fetch('/api/fs/section?root=Notes'),
      fetch('/api/fs/section?root=Knowledge'),
    ]);
    if (notesRes.ok) notesTree = await notesRes.json();
    if (knowledgeRes.ok) knowledgeTree = await knowledgeRes.json();
  }

  function toggle(path: string) {
    expanded.has(path) ? expanded.delete(path) : expanded.add(path);
    expanded = new Set(expanded);
  }

  function startAddSection(root: 'Notes' | 'Knowledge') {
    addingSection = root;
    newSectionName = '';
    newSectionError = '';
  }

  function cancelAddSection() {
    addingSection = null;
    newSectionName = '';
    newSectionError = '';
  }

  async function createSection() {
    const name = newSectionName.trim().toLowerCase();
    if (!name) return;

    const res = await fetch('/api/section/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: addingSection, name }),
    });

    const body = await res.json();
    if (!res.ok) {
      newSectionError = body.error ?? 'Failed to create section';
      return;
    }

    const root = addingSection;
    cancelAddSection();
    await loadSectionTrees();
    goto(`/${root!.toLowerCase()}/${name}`);
  }

  function handleSectionKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') createSection();
    if (e.key === 'Escape') cancelAddSection();
  }

  $: currentPath = $page.url.pathname;
</script>

<nav class="w-60 bg-ink-900 border-r border-ink-700/50 flex flex-col overflow-hidden shrink-0">
  <!-- Logo -->
  <div class="px-5 py-5 border-b border-ink-700/50">
    <div class="flex items-center gap-2.5">
      <span class="text-leaf-400 text-xl">◈</span>
      <span class="font-display font-light text-lg tracking-wide">SheafJournal</span>
    </div>
    <p class="text-xs text-ink-500 mt-1 font-mono">developer journal</p>
  </div>

  <!-- Nav -->
  <div class="px-3 py-3 border-b border-ink-700/50 space-y-0.5">
    {#each [
      { href: '/',          icon: '⊟', label: 'Home'      },
      { href: '/journal',   icon: '⊞', label: 'Journal'   },
      { href: '/notes',     icon: '⊡', label: 'Notes'     },
      { href: '/knowledge', icon: '⊠', label: 'Knowledge' },
      { href: '/search',    icon: '⊙', label: 'Search'    },
    ] as nav}
      <a href={nav.href}
         class="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                {currentPath === nav.href || (nav.href !== '/' && currentPath.startsWith(nav.href))
                  ? 'bg-ink-700 text-ink-100'
                  : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800'}">
        <span class="opacity-60 text-xs">{nav.icon}</span>
        {nav.label}
      </a>
    {/each}
  </div>

  <!-- Tree -->
  <div class="flex-1 overflow-y-auto px-2 py-3 space-y-4">

    <!-- Journal tree — only when on journal routes -->
    {#if tree && currentPath.startsWith('/journal')}
      {@const journalNode = (tree.children ?? []).find(c => c.name === 'Journal')}
      {#if journalNode}
        <div>
          <p class="px-3 pb-1 text-xs text-ink-600 uppercase tracking-widest font-mono">Journal</p>
          {#each journalNode.children ?? [] as yearNode}
            {@const yearHref = `/journal/${yearNode.name}`}
            <a href={yearHref}
               onclick={() => toggle(yearNode.path)}
               class="w-full flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors
                      {currentPath.startsWith(yearHref)
                        ? 'bg-ink-700/70 text-ink-100'
                        : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800'}">
              <span class="text-xs opacity-50 w-3">{expanded.has(yearNode.path) ? '▾' : '▸'}</span>
              <span class="font-medium">{yearNode.name}</span>
            </a>

            {#if expanded.has(yearNode.path)}
              {#each yearNode.children ?? [] as monthNode}
                {@const monthHref = `/journal/${yearNode.name}/${monthNode.name}`}
                <a href={monthHref}
                   onclick={() => toggle(monthNode.path)}
                   class="w-full flex items-center gap-1.5 pl-6 pr-3 py-1.5 rounded text-sm transition-colors
                          {currentPath.startsWith(monthHref)
                            ? 'bg-ink-700/70 text-ink-200'
                            : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800'}">
                  <span class="text-xs opacity-50 w-3">{expanded.has(monthNode.path) ? '▾' : '▸'}</span>
                  <span>{MONTHS[monthNode.name] ?? monthNode.name}</span>
                </a>

                {#if expanded.has(monthNode.path)}
                  {#each monthNode.children ?? [] as dayNode}
                    {@const dayHref = `/journal/${yearNode.name}/${monthNode.name}/${dayNode.name}`}
                    <a href={dayHref}
                       class="flex items-center gap-1.5 pl-10 pr-3 py-1 rounded text-xs transition-colors
                              {currentPath === dayHref
                                ? 'bg-ink-700/70 text-ink-100'
                                : 'text-ink-500 hover:text-ink-300 hover:bg-ink-800'}">
                      <span class="opacity-40">▸</span>
                      {dayNode.name}
                      <span class="ml-auto text-ink-700 font-mono">
                        {(dayNode.children ?? []).filter((c: FileNode) => c.type === 'file').length}
                      </span>
                    </a>
                  {/each}
                {/if}
              {/each}
            {/if}
          {/each}
        </div>
      {/if}
    {/if}

    <!-- Notes tree — only when on notes routes -->
    {#if currentPath.startsWith('/notes')}
      <div>
        <div class="flex items-center px-3 pb-1">
          <p class="text-xs text-ink-600 uppercase tracking-widest font-mono flex-1">Notes</p>
          <button
                  onclick={() => startAddSection('Notes')}
                  class="text-ink-600 hover:text-leaf-400 transition-colors text-sm leading-none"
                  title="New section">+</button>
        </div>

        {#if addingSection === 'Notes'}
          <div class="px-3 pb-2">
            <input
                    type="text"
                    bind:value={newSectionName}
                    onkeydown={handleSectionKeydown}
                    placeholder="section-name"
                    autofocus
                    class="w-full bg-ink-800 border border-ink-600 rounded px-2 py-1 text-xs
                     text-ink-200 font-mono placeholder-ink-600 focus:outline-none
                     focus:border-leaf-500 transition-colors"/>
            {#if newSectionError}
              <p class="text-xs text-rose-400 mt-1">{newSectionError}</p>
            {/if}
            <p class="text-xs text-ink-600 mt-1">Enter to create · Esc to cancel</p>
          </div>
        {/if}

        {#each notesTree?.children ?? [] as sectionNode}
          {@const sectionHref = `/notes/${sectionNode.name}`}
          <button
                  onclick={() => toggle(sectionNode.path)}
                  class="w-full flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors
                   {currentPath.startsWith(sectionHref)
                     ? 'bg-ink-700/70 text-ink-100'
                     : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800'}">
            <span class="text-xs opacity-50 w-3">{expanded.has(sectionNode.path) ? '▾' : '▸'}</span>
            <a href={sectionHref} class="flex-1 text-left" onclick={(e) => e.stopPropagation()}>
              {sectionNode.name}
            </a>
          </button>

          {#if expanded.has(sectionNode.path)}
            {#each sectionNode.children ?? [] as fileNode}
              {@const fileHref = `/notes/${sectionNode.name}/${fileNode.name}`}
              <a href={fileHref}
                 class="flex items-center gap-1.5 pl-8 pr-3 py-1 rounded text-xs transition-colors
                        {currentPath === fileHref
                          ? 'bg-ink-700/70 text-ink-100'
                          : 'text-ink-500 hover:text-ink-300 hover:bg-ink-800'}">
                <span class="opacity-40">◆</span>
                {fileNode.name}
              </a>
            {/each}
          {/if}
        {/each}

        {#if (notesTree?.children ?? []).length === 0 && addingSection !== 'Notes'}
          <p class="px-3 py-2 text-xs text-ink-700">No sections yet</p>
        {/if}
      </div>
    {/if}

    <!-- Knowledge tree — only when on knowledge routes -->
    {#if currentPath.startsWith('/knowledge')}
      <div>
        <div class="flex items-center px-3 pb-1">
          <p class="text-xs text-ink-600 uppercase tracking-widest font-mono flex-1">Knowledge</p>
          <button
                  onclick={() => startAddSection('Knowledge')}
                  class="text-ink-600 hover:text-leaf-400 transition-colors text-sm leading-none"
                  title="New section">+</button>
        </div>

        {#if addingSection === 'Knowledge'}
          <div class="px-3 pb-2">
            <input
                    type="text"
                    bind:value={newSectionName}
                    onkeydown={handleSectionKeydown}
                    placeholder="section-name"
                    autofocus
                    class="w-full bg-ink-800 border border-ink-600 rounded px-2 py-1 text-xs
                     text-ink-200 font-mono placeholder-ink-600 focus:outline-none
                     focus:border-leaf-500 transition-colors"/>
            {#if newSectionError}
              <p class="text-xs text-rose-400 mt-1">{newSectionError}</p>
            {/if}
            <p class="text-xs text-ink-600 mt-1">Enter to create · Esc to cancel</p>
          </div>
        {/if}

        {#each knowledgeTree?.children ?? [] as sectionNode}
          {@const sectionHref = `/knowledge/${sectionNode.name}`}
          <button
                  onclick={() => toggle(sectionNode.path)}
                  class="w-full flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors
                   {currentPath.startsWith(sectionHref)
                     ? 'bg-ink-700/70 text-ink-100'
                     : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800'}">
            <span class="text-xs opacity-50 w-3">{expanded.has(sectionNode.path) ? '▾' : '▸'}</span>
            <a href={sectionHref} class="flex-1 text-left" onclick={(e) => e.stopPropagation()}>
              {sectionNode.name}
            </a>
          </button>

          {#if expanded.has(sectionNode.path)}
            {#each sectionNode.children ?? [] as fileNode}
              {@const fileHref = `/knowledge/${sectionNode.name}/${fileNode.name}`}
              <a href={fileHref}
                 class="flex items-center gap-1.5 pl-8 pr-3 py-1 rounded text-xs transition-colors
                        {currentPath === fileHref
                          ? 'bg-ink-700/70 text-ink-100'
                          : 'text-ink-500 hover:text-ink-300 hover:bg-ink-800'}">
                <span class="opacity-40">◆</span>
                {fileNode.name}
              </a>
            {/each}
          {/if}
        {/each}

        {#if (knowledgeTree?.children ?? []).length === 0 && addingSection !== 'Knowledge'}
          <p class="px-3 py-2 text-xs text-ink-700">No sections yet</p>
        {/if}
      </div>
    {/if}

    {#if !tree}
      <div class="px-4 py-8 text-center text-ink-600 text-xs">Loading…</div>
    {/if}
  </div>

  <div class="px-4 py-3 border-t border-ink-700/50">
    <p class="text-xs text-ink-600 font-mono">● ready</p>
  </div>
</nav>