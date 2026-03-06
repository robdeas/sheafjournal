<script lang="ts">
    import { fileIcon, fileClass, processWikiLinks } from '$lib/types';
    import type { FileNode } from '$lib/types';
    import { onMount, tick } from 'svelte';
    import { goto } from '$app/navigation';

    export let root: 'Notes' | 'Knowledge';
    export let section: string | null = null;
    export let filename: string | null = null;

    let sectionTree: FileNode | null = null;
    let files: FileNode[] = [];
    let selectedFile: FileNode | null = null;
    let activeTab: 'preview' | 'edit' | 'remove' | 'settings' = 'preview';

    // ── Section info ──────────────────────────────────────────────────────────
    let sectionDisplayName = '';
    let sectionDescription = '';
    let sectionTags = '';
    let savingInfo = false;
    let infoSaved = false;

    // ── Section delete ────────────────────────────────────────────────────────
    let confirmDigit: number | null = null;
    let enteredDigit = '';
    $: digitMatch = enteredDigit === String(confirmDigit);

    onMount(async () => {
        await loadTree();
        if (section) await loadSectionInfo();
    });

    async function loadTree() {
        const res = await fetch(`/api/fs/section?root=${root}`);
        if (!res.ok) return;
        sectionTree = await res.json();

        if (section) {
            const sectionNode = (sectionTree?.children ?? []).find(c => c.name === section);
            files = sectionNode?.children?.filter(c => c.type === 'file') ?? [];

            if (filename) {
                const target = files.find(f => f.name === filename);
                if (target) await selectFile(target);
            } else if (files.length > 0) {
                await selectFile(files[0]);
            }
        }
    }

    async function loadSectionInfo() {
        const res = await fetch(`/api/section/info?root=${root}&section=${section}`);
        if (!res.ok) return;
        const info = await res.json();
        sectionDisplayName = info.displayName ?? section ?? '';
        sectionDescription = info.description ?? '';
        sectionTags = (info.tags ?? []).join(', ');
    }

    async function saveSectionInfo() {
        savingInfo = true;
        const res = await fetch('/api/section/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                root,
                section,
                displayName: sectionDisplayName.trim() || section,
                description: sectionDescription.trim(),
                tags: sectionTags.split(',').map((t: string) => t.trim()).filter(Boolean),
            }),
        });
        savingInfo = false;
        if (res.ok) {
            infoSaved = true;
            setTimeout(() => infoSaved = false, 2000);
        }
    }

    async function deleteSection() {
        const res = await fetch('/api/section/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ root, section }),
        });
        if (res.ok) goto(`/${root.toLowerCase()}`);
    }

    function openSettings() {
        activeTab = 'settings';
        confirmDigit = Math.floor(Math.random() * 10);
        enteredDigit = '';
    }

    function isEditable(file: FileNode): boolean {
        return file.ext === 'md' || file.ext === 'txt';
    }

    async function selectFile(file: FileNode) {
        selectedFile = file;
        previewHtml = '';
        previewTags = [];
        editContent = '';
        saveStatus = 'saved';
        activeTab = 'preview';
        confirmDelete = false;
        await loadPreview(file);
        if (isEditable(file)) await loadEditContent(file);
    }

    // ── Preview ───────────────────────────────────────────────────────────────
    let previewHtml = '';
    let previewTags: string[] = [];
    let previewLoading = false;

    async function loadPreview(file: FileNode) {
        previewLoading = true;
        try {
            const res = await fetch('/api/doc/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: file.path }),
            });
            const { html, tags } = await res.json();
            previewHtml = processWikiLinks(html ?? '');
            previewTags = tags ?? [];
            previewLoading = false;
            await renderMermaid();
        } catch (e) {
            previewHtml = '<p class="text-rose-400">Failed to load preview.</p>';
            previewLoading = false;
        }
        fetch(`/api/meta?path=${encodeURIComponent(file.path)}`, { method: 'POST' });
    }

    async function renderMermaid() {
        await tick();
        const nodes = document.querySelectorAll('.mermaid:not([data-processed])') as NodeListOf<HTMLElement>;
        if (nodes.length === 0) return;
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                background: '#13161d',
                primaryColor: '#1c2030',
                primaryTextColor: '#e8eaf0',
                primaryBorderColor: '#3d4560',
                lineColor: '#4ade80',
                secondaryColor: '#252a3a',
            },
        });
        await mermaid.run({ nodes });
    }

    $: if (activeTab === 'preview' && previewHtml) renderMermaid();

    function handlePreviewClick(e: MouseEvent) {
        const a = (e.target as HTMLElement).closest('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href) return;
        if (href.startsWith('http') || href.startsWith('/') || href.startsWith('#')) return;
        e.preventDefault();
        const target = files.find(f => f.name === href);
        if (target) selectFile(target);
    }

    // ── Editor ────────────────────────────────────────────────────────────────
    let editContent = '';
    let saveStatus: 'saved' | 'unsaved' | 'saving' | 'error' = 'saved';
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadEditContent(file: FileNode) {
        try {
            const res = await fetch(`/api/doc/raw?path=${encodeURIComponent(file.path)}`);
            editContent = await res.text();
        } catch {
            editContent = '';
        }
    }

    function onEditInput() {
        saveStatus = 'unsaved';
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveFile, 800);
    }

    async function saveFile() {
        if (!selectedFile) return;
        saveStatus = 'saving';
        try {
            const res = await fetch('/api/doc/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: selectedFile.path, content: editContent }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error ?? 'Save failed');
            saveStatus = 'saved';
            await loadPreview(selectedFile);
        } catch {
            saveStatus = 'error';
        }
    }

    // ── New note ──────────────────────────────────────────────────────────────
    let creating = false;

    async function createNote() {
        if (!section) return;
        creating = true;
        try {
            const res = await fetch('/api/section/doc/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ root, section }),
            });
            const result = await res.json();
            if (!res.ok) { console.error('create failed:', result.error); return; }
            await loadTree();
            const newFile = files.find(f => f.name === result.filename);
            if (newFile) {
                await selectFile(newFile);
                activeTab = 'edit';
            }
        } finally {
            creating = false;
        }
    }

    // ── Delete file ───────────────────────────────────────────────────────────
    let confirmDelete = false;

    async function deleteFile() {
        if (!selectedFile) return;
        const res = await fetch('/api/doc/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: selectedFile.path }),
        });
        if (res.ok) {
            selectedFile = null;
            confirmDelete = false;
            await loadTree();
            if (files.length > 0) await selectFile(files[0]);
        }
    }
</script>

<div class="flex flex-col h-full overflow-hidden">

    {#if !section}
        <div class="flex flex-col items-center justify-center h-full text-ink-600">
            <span class="text-4xl mb-3 text-leaf-500/40">◈</span>
            <p class="text-sm text-ink-400">Select a section from the sidebar.</p>
        </div>

    {:else}
        <!-- File tabs -->
        <div class="flex items-center gap-0 border-b border-ink-800 bg-ink-900/60 overflow-x-auto shrink-0">
            {#each files as file}
                <button
                        onclick={() => selectFile(file)}
                        class="flex items-center gap-2 px-4 py-3 text-xs border-r border-ink-800
                           transition-colors whitespace-nowrap shrink-0
                           {selectedFile?.path === file.path
                             ? 'bg-ink-950 text-ink-100 border-b-2 border-b-leaf-500'
                             : 'text-ink-500 hover:text-ink-300 hover:bg-ink-800/50'}">
                    <span class={fileClass(file.ext)}>{fileIcon(file.ext)}</span>
                    {file.name}
                    {#if selectedFile?.path === file.path && isEditable(file)}
                        <span class="ml-1 text-ink-600 font-mono text-xs">
                            {#if saveStatus === 'unsaved'}●{/if}
                            {#if saveStatus === 'saving'}○{/if}
                            {#if saveStatus === 'error'}✕{/if}
                        </span>
                    {/if}
                </button>
            {/each}

            <div class="ml-auto flex items-center border-l border-ink-800 shrink-0">
                <button
                        onclick={createNote}
                        disabled={creating}
                        class="flex items-center gap-1.5 px-4 py-3 text-xs text-ink-300
                           hover:text-leaf-400 hover:bg-ink-800/50 transition-colors whitespace-nowrap">
                    <span class="text-leaf-500">+</span>
                    {creating ? 'Creating…' : 'New Note'}
                </button>
                <button
                        onclick={openSettings}
                        title="Section settings"
                        class="px-3 py-3 text-xs border-l border-ink-800 transition-colors
                           {activeTab === 'settings'
                             ? 'text-ink-100 bg-ink-800'
                             : 'text-ink-600 hover:text-ink-300 hover:bg-ink-800/50'}">
                    ⚙
                </button>
            </div>
        </div>

        <!-- Preview / Edit / Remove bar -->
        {#if selectedFile && activeTab !== 'settings'}
            <div class="flex border-b border-ink-800/60 bg-ink-900/30 shrink-0">
                {#if isEditable(selectedFile)}
                    {#each ['preview', 'edit'] as tab}
                        <button
                                onclick={() => activeTab = tab}
                                class="px-5 py-2 text-xs transition-colors capitalize
                                   {activeTab === tab
                                     ? 'text-ink-100 border-b-2 border-leaf-500'
                                     : 'text-ink-500 hover:text-ink-300'}">
                            {tab}
                        </button>
                    {/each}
                {/if}
                <button
                        onclick={() => { confirmDelete = true; activeTab = 'remove'; }}
                        class="px-5 py-2 text-xs transition-colors
                           {activeTab === 'remove'
                             ? 'text-rose-400 border-b-2 border-rose-500'
                             : 'text-ink-500 hover:text-rose-400'}">
                    remove
                </button>
                {#if isEditable(selectedFile)}
                    <div class="ml-auto px-4 py-2 text-xs font-mono
                                {saveStatus === 'saved'   ? 'text-ink-400'   : ''}
                                {saveStatus === 'unsaved' ? 'text-amber-400' : ''}
                                {saveStatus === 'saving'  ? 'text-ink-400'   : ''}
                                {saveStatus === 'error'   ? 'text-rose-400'  : ''}">
                        {#if saveStatus === 'saved'}✓ saved{/if}
                        {#if saveStatus === 'unsaved'}● unsaved{/if}
                        {#if saveStatus === 'saving'}saving…{/if}
                        {#if saveStatus === 'error'}✕ error{/if}
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Content area -->
        <div class="flex-1 overflow-hidden">

            {#if activeTab === 'settings'}
                <div class="h-full overflow-y-auto px-10 py-8 max-w-2xl">

                    <h2 class="text-lg font-display font-light text-ink-100 mb-1">Section Settings</h2>
                    <p class="text-xs text-ink-600 font-mono mb-8">{root}/{section}</p>

                    <!-- Info -->
                    <div class="space-y-4 mb-10">
                        <div>
                            <label class="text-xs text-ink-500 mb-1 block font-mono">Display name</label>
                            <input
                                    type="text"
                                    bind:value={sectionDisplayName}
                                    class="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm
                                       text-ink-200 focus:outline-none focus:border-leaf-500 transition-colors"/>
                        </div>
                        <div>
                            <label class="text-xs text-ink-500 mb-1 block font-mono">Description</label>
                            <textarea
                                    bind:value={sectionDescription}
                                    rows="3"
                                    class="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm
                                       text-ink-200 focus:outline-none focus:border-leaf-500 transition-colors resize-none"/>
                        </div>
                        <div>
                            <label class="text-xs text-ink-500 mb-1 block font-mono">Tags (comma separated)</label>
                            <input
                                    type="text"
                                    bind:value={sectionTags}
                                    placeholder="e.g. java, backend, spring"
                                    class="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm
                                       text-ink-200 font-mono placeholder-ink-600 focus:outline-none
                                       focus:border-leaf-500 transition-colors"/>
                        </div>
                        <div class="flex items-center gap-3">
                            <button
                                    onclick={saveSectionInfo}
                                    disabled={savingInfo}
                                    class="px-4 py-2 rounded-lg text-sm bg-leaf-500/10 border border-leaf-500/40
                                       text-leaf-400 hover:bg-leaf-500/20 transition-colors
                                       disabled:opacity-40 disabled:cursor-not-allowed">
                                {savingInfo ? 'Saving…' : 'Save'}
                            </button>
                            {#if infoSaved}
                                <span class="text-xs text-leaf-500 font-mono">✓ saved</span>
                            {/if}
                        </div>
                    </div>

                    <!-- Delete -->
                    <div class="border-t border-ink-800 pt-8">
                        <h3 class="text-sm text-rose-400 mb-4">Delete Section</h3>

                        {#if files.length === 0}
                            <p class="text-sm text-ink-400 mb-4">This section is empty and can be deleted without confirmation.</p>
                            <button
                                    onclick={deleteSection}
                                    class="px-4 py-2 rounded-lg text-sm bg-rose-500/10 border border-rose-500/40
                                       text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 transition-colors">
                                Delete section
                            </button>
                        {:else}
                            <p class="text-sm text-ink-400 mb-3">
                                This will permanently delete <span class="font-mono text-ink-200">{section}</span>
                                and all {files.length} file{files.length === 1 ? '' : 's'} inside it.
                            </p>
                            <div class="border border-ink-700/40 rounded-lg p-3 text-xs font-mono
                                        text-ink-500 space-y-0.5 mb-4 max-h-32 overflow-y-auto">
                                {#each files as f}
                                    <div>— {f.name}</div>
                                {/each}
                            </div>
                            <p class="text-sm text-ink-400 mb-3">
                                Type the digit
                                <span class="font-mono text-2xl text-rose-400 mx-2">{confirmDigit}</span>
                                to confirm:
                            </p>
                            <div class="flex items-center gap-4">
                                <input
                                        type="text"
                                        maxlength="1"
                                        bind:value={enteredDigit}
                                        placeholder="?"
                                        class="w-16 text-center text-2xl font-mono bg-ink-900 border-2 rounded-lg py-3
                                           focus:outline-none transition-colors
                                           {digitMatch ? 'border-rose-500 text-rose-400' : 'border-ink-700 text-ink-300'}"/>
                                <button
                                        onclick={deleteSection}
                                        disabled={!digitMatch}
                                        class="px-4 py-2 rounded-lg text-sm border transition-colors
                                           {digitMatch
                                             ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20'
                                             : 'bg-ink-900/50 border-ink-800 text-ink-700 cursor-not-allowed'}">
                                    Delete section permanently
                                </button>
                            </div>
                        {/if}
                        <p class="text-xs text-ink-700 mt-4">This cannot be undone.</p>
                    </div>
                </div>

            {:else if !selectedFile}
                <div class="flex flex-col items-center justify-center h-full text-ink-600">
                    <span class="text-4xl mb-3">◈</span>
                    <p class="text-sm mb-6">No notes in this section yet.</p>
                    <button
                            onclick={createNote}
                            disabled={creating}
                            class="flex items-center gap-2 bg-ink-900 border border-ink-700/40
                               hover:border-leaf-500/50 hover:bg-ink-800/60 rounded-xl px-6 py-4
                               text-sm text-ink-300 hover:text-leaf-400 transition-all group">
                        <span class="text-xl text-leaf-500 group-hover:text-leaf-400">+</span>
                        {creating ? 'Creating…' : 'Create a new note'}
                    </button>
                </div>

            {:else if activeTab === 'remove'}
                <div class="flex flex-col items-center justify-center h-full text-ink-600 px-8">
                    <span class="text-4xl mb-4 text-rose-500/40">◈</span>
                    <p class="text-sm text-ink-400 mb-1">Delete this file permanently?</p>
                    <p class="text-xs font-mono text-ink-600 mb-8">{selectedFile.path}</p>
                    <div class="flex gap-3">
                        <button
                                onclick={() => { activeTab = 'preview'; confirmDelete = false; }}
                                class="px-5 py-2.5 rounded-lg text-sm bg-ink-900 border border-ink-700
                                   text-ink-300 hover:bg-ink-800 transition-colors">
                            Cancel
                        </button>
                        <button
                                onclick={deleteFile}
                                class="px-5 py-2.5 rounded-lg text-sm bg-rose-500/10 border border-rose-500/40
                                   text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 transition-colors">
                            Delete permanently
                        </button>
                    </div>
                    <p class="text-xs text-ink-700 mt-6">This cannot be undone.</p>
                </div>

            {:else if activeTab === 'edit' && isEditable(selectedFile)}
                <textarea
                        bind:value={editContent}
                        oninput={onEditInput}
                        spellcheck="false"
                        placeholder="Start writing…"
                        class="w-full h-full resize-none bg-ink-950 text-ink-200 font-mono text-sm
                           leading-relaxed px-10 py-8 focus:outline-none
                           placeholder-ink-700 caret-leaf-400">
                </textarea>

            {:else}
                <div class="h-full overflow-y-auto">
                    {#if previewLoading}
                        <div class="flex items-center justify-center mt-32">
                            <div class="flex gap-2">
                                {#each [0, 1, 2] as i}
                                    <div class="w-2 h-2 bg-leaf-500 rounded-full animate-bounce"
                                         style="animation-delay:{i * 0.15}s"></div>
                                {/each}
                            </div>
                        </div>
                    {:else if previewHtml}
                        <article
                                onclick={handlePreviewClick}
                                class="prose prose-invert prose-slate max-w-3xl mx-auto px-10 py-8
                                   prose-headings:font-display prose-headings:font-light
                                   prose-h1:text-3xl prose-h1:text-ink-100
                                   prose-h2:text-xl prose-h2:text-ink-200
                                   prose-p:text-ink-300 prose-p:leading-relaxed
                                   prose-code:text-leaf-300 prose-code:bg-ink-800
                                   prose-strong:text-ink-100
                                   prose-a:text-leaf-400 prose-a:no-underline prose-a:cursor-pointer">
                            {@html previewHtml}
                        </article>
                    {/if}
                    {#if previewTags.length > 0}
                        <div class="max-w-3xl mx-auto px-10 py-4 flex flex-wrap gap-2">
                            {#each previewTags as tag}
                                <a href="/search?q=tag:{tag}"
                                   class="text-xs px-2 py-0.5 bg-ink-800 border border-ink-700
                                          rounded-full text-leaf-400 font-mono
                                          hover:border-leaf-500/50 hover:bg-ink-700 transition-colors">
                                    #{tag}
                                </a>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}

        </div>
    {/if}

</div>