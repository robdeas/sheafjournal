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
  import { fileIcon, fileClass, processWikiLinks } from '$lib/types';
  import type { FileNode } from '$lib/types';
  import { invalidateAll } from '$app/navigation';
  import { onMount, tick } from 'svelte';

  export let data: PageData;

  $: files = (data.node.children ?? []).filter((c: FileNode) => c.type === 'file');
  $: folderView = files.find(f => f.name === 'sheafbase-folder-view.md') ?? null;
  $: otherFiles = files.filter(f => f.name !== 'sheafbase-folder-view.md');

  let selectedFile: FileNode | null = null;
  let activeTab: 'preview' | 'edit' | 'remove' = 'preview';

  // ── Day summary (tasks + file metadata) ──────────────────────────────────
  interface TaskItem { done: boolean; text: string; source: string; }
  interface FileMeta { name: string; ext: string; wordCount: number; readingMins: number; modifiedAt: string; sizeBytes: number; }
  let summaryTasks: TaskItem[] = [];
  let summaryFiles: FileMeta[] = [];

  async function loadSummary() {
    const dayPath = `/Journal/${data.year}/${data.month}/${data.day}`;
    try {
      const res = await fetch(`/api/day/summary?path=${encodeURIComponent(dayPath)}`);
      const body = await res.json();
      summaryTasks = body.tasks ?? [];
      summaryFiles = body.files ?? [];
    } catch {
      summaryTasks = [];
      summaryFiles = [];
    }
  }

  // ── Task management ───────────────────────────────────────────────────────
  let newTaskText = '';
  let addingTask = false;

  async function addTask() {
    const text = newTaskText.trim();
    if (!text) return;
    addingTask = true;
    try {
      const res = await fetch('/api/task/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayPath: `/Journal/${data.year}/${data.month}/${data.day}`,
          text,
        }),
      });
      if (res.ok) {
        newTaskText = '';
        await loadSummary();
      }
    } finally {
      addingTask = false;
    }
  }

  async function toggleTask(task: TaskItem) {
    // Find which file contains this task — use source filename
    const filePath = `/Journal/${data.year}/${data.month}/${data.day}/${task.source}`;
    const res = await fetch('/api/task/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, text: task.text, done: task.done }),
    });
    if (res.ok) await loadSummary();
  }

  async function deleteTask(task: TaskItem) {
    const filePath = `/Journal/${data.year}/${data.month}/${data.day}/${task.source}`;
    const res = await fetch('/api/task/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, text: task.text, done: task.done }),
    });
    if (res.ok) await loadSummary();
  }

  function handleTaskKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') addTask();
    if (e.key === 'Escape') newTaskText = '';
  }

  function formatRelTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  onMount(() => {
    const first = folderView ?? files[0] ?? null;
    if (first) selectFile(first);
  });

  function isEditable(file: FileNode): boolean {
    return file.ext === 'md' || file.ext === 'txt';
  }

  function isFolderView(file: FileNode): boolean {
    return file.name === 'sheafbase-folder-view.md';
  }

  async function selectFile(file: FileNode) {
    selectedFile = file;
    previewHtml = '';
    previewTags = [];
    editContent = '';
    saveStatus = 'saved';
    activeTab = 'preview';
    confirmDigit = null;
    enteredDigit = '';
    await loadPreview(file);
    if (isFolderView(file)) await loadSummary();
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
      console.error('preview error:', e);
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

  $: if (activeTab === 'preview' && previewHtml) {
    renderMermaid();
  }

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
      if (isFolderView(selectedFile)) await loadSummary();
    } catch (e) {
      console.error('save error:', e);
      saveStatus = 'error';
    }
  }

  // ── New note ──────────────────────────────────────────────────────────────
  let creating = false;

  async function createNote() {
    creating = true;
    try {
      const dir = data.node.absPath;
      const res = await fetch('/api/doc/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir, year: data.year, month: data.month, day: data.day }),
      });
      const result = await res.json();
      if (!res.ok) { console.error('create failed:', result.error); return; }
      const { path, filename } = result;

      await invalidateAll();
      await new Promise(resolve => setTimeout(resolve, 50));

      const newFile = files.find(f => f.name === filename);
      if (newFile) {
        await selectFile(newFile);
        activeTab = 'edit';
      } else {
        await selectFile({ name: filename, type: 'file', path, ext: 'md' });
        activeTab = 'edit';
      }
    } finally {
      creating = false;
    }
  }

  // ── Delete single file ────────────────────────────────────────────────────
  async function deleteFile() {
    if (!selectedFile) return;
    const res = await fetch('/api/doc/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selectedFile.path }),
    });
    if (res.ok) {
      selectedFile = null;
      activeTab = 'preview';
      await invalidateAll();
      await tick();
      const fv = files.find(f => f.name === 'sheafbase-folder-view.md');
      if (fv) selectFile(fv);
    } else {
      const body = await res.json();
      console.error('delete failed:', body.error);
    }
  }

  // ── Delete entire day folder ──────────────────────────────────────────────
  async function deleteFolder() {
    const res = await fetch('/api/doc/delete-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `/Journal/${data.year}/${data.month}/${data.day}` }),
    });
    if (res.ok) {
      window.location.href = `/journal/${data.year}/${data.month}`;
    } else {
      const body = await res.json();
      console.error('delete folder failed:', body.error);
    }
  }

  // ── Digit confirmation ────────────────────────────────────────────────────
  let confirmDigit: number | null = null;
  let enteredDigit: string = '';

  function openRemoveTab() {
    activeTab = 'remove';
    confirmDigit = Math.floor(Math.random() * 10);
    enteredDigit = '';
  }

  $: digitMatch = enteredDigit === String(confirmDigit);

  $: doneTasks = summaryTasks.filter(t => t.done);
  $: pendingTasks = summaryTasks.filter(t => !t.done);
</script>

<div class="flex flex-col h-full overflow-hidden">

  <!-- File tabs -->
  <div class="flex items-center gap-0 border-b border-ink-800 bg-ink-900/60 overflow-x-auto shrink-0">

    {#if folderView}
      <button
              onclick={() => selectFile(folderView)}
              class="flex items-center gap-2 px-4 py-3 text-xs border-r border-ink-800
               transition-colors whitespace-nowrap shrink-0
               {selectedFile?.path === folderView.path
                 ? 'bg-ink-950 text-ink-100 border-b-2 border-b-leaf-500'
                 : 'text-ink-500 hover:text-ink-300 hover:bg-ink-800/50'}">
        <span class="text-leaf-500">◈</span>
        Overview
      </button>
    {/if}

    {#each otherFiles as file}
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

    <button
            onclick={createNote}
            disabled={creating}
            class="flex items-center gap-1.5 px-4 py-3 text-xs text-ink-300
             hover:text-leaf-400 hover:bg-ink-800/50 transition-colors
             whitespace-nowrap shrink-0 ml-auto border-l border-ink-800">
      <span class="text-leaf-500">+</span>
      {creating ? 'Creating…' : 'New Note'}
    </button>
  </div>

  <!-- Preview / Edit / Remove tabs -->
  {#if selectedFile}
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
              onclick={openRemoveTab}
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

    {#if !selectedFile}
      <div class="flex flex-col items-center justify-center h-full text-ink-600">
        <span class="text-4xl mb-3">◈</span>
        <p class="text-sm mb-6">No documents yet for this day.</p>
        <button
                onclick={createNote}
                disabled={creating}
                class="flex items-center gap-2 bg-ink-900 border border-ink-700/40
                 hover:border-leaf-500/50 hover:bg-ink-800/60 rounded-xl px-6 py-4
                 text-sm text-ink-300 hover:text-leaf-400 transition-all group">
          <span class="text-xl text-leaf-500 group-hover:text-leaf-400">+</span>
          {creating ? 'Creating…' : 'Create a new note'}
        </button>
        <p class="text-xs text-ink-700 mt-4 font-mono">
          {data.year}-{data.month}-{data.day}
        </p>
      </div>

    {:else if activeTab === 'remove'}

      {#if isFolderView(selectedFile)}
        <div class="flex flex-col items-center justify-center h-full text-ink-600 px-8">
          <span class="text-4xl mb-4 text-rose-500/40">⚠</span>
          <p class="text-base text-rose-400 font-medium mb-2">Delete entire day?</p>
          <p class="text-sm text-ink-400 mb-1 text-center">
            This will permanently delete the folder for
            <span class="font-mono text-ink-200">{data.year}-{data.month}-{data.day}</span>
            and all {files.length} file{files.length === 1 ? '' : 's'} inside it.
          </p>
          <div class="mt-2 mb-6 max-w-xs w-full">
            <div class="border border-ink-700/40 rounded-lg p-3 text-xs font-mono text-ink-500 space-y-0.5">
              {#each files as f}
                <div>— {f.name}</div>
              {/each}
            </div>
          </div>
          <p class="text-sm text-ink-400 mb-4">
            To confirm, type the digit
            <span class="font-mono text-2xl text-rose-400 mx-2">{confirmDigit}</span>
            below:
          </p>
          <input
                  type="text"
                  maxlength="1"
                  bind:value={enteredDigit}
                  placeholder="?"
                  class="w-16 text-center text-2xl font-mono bg-ink-900 border-2 rounded-lg py-3
                   focus:outline-none transition-colors
                   {digitMatch ? 'border-rose-500 text-rose-400' : 'border-ink-700 text-ink-300'}"/>
          <div class="flex gap-3 mt-6">
            <button
                    onclick={() => { activeTab = 'preview'; enteredDigit = ''; }}
                    class="px-5 py-2.5 rounded-lg text-sm bg-ink-900 border border-ink-700
                     text-ink-300 hover:bg-ink-800 transition-colors">
              Cancel
            </button>
            <button
                    onclick={deleteFolder}
                    disabled={!digitMatch}
                    class="px-5 py-2.5 rounded-lg text-sm border transition-colors
                     {digitMatch
                       ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20'
                       : 'bg-ink-900/50 border-ink-800 text-ink-700 cursor-not-allowed'}">
              Delete entire day
            </button>
          </div>
          <p class="text-xs text-ink-700 mt-4">This cannot be undone.</p>
        </div>

      {:else}
        <div class="flex flex-col items-center justify-center h-full text-ink-600">
          <span class="text-4xl mb-4 text-rose-500/40">◈</span>
          <p class="text-sm text-ink-400 mb-1">Delete this file permanently?</p>
          <p class="text-xs font-mono text-ink-600 mb-8">{selectedFile.path}</p>
          <div class="flex gap-3">
            <button
                    onclick={() => activeTab = 'preview'}
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
      {/if}

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
      <!-- Preview -->
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
        {:else if previewHtml || previewTags.length > 0}
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

          {#if previewTags.length > 0 && selectedFile && !isFolderView(selectedFile)}
            <div class="max-w-3xl mx-auto px-10 pb-6 flex flex-wrap gap-2">
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

          <!-- ── Dynamic summary — only shown on Overview tab ── -->
          {#if selectedFile && isFolderView(selectedFile)}
            <div class="max-w-3xl mx-auto px-10 pb-12">

              <!-- Tasks -->
              <div class="mb-8">
                <h2 class="text-xs uppercase tracking-widest text-ink-300 mb-3 flex items-center gap-2">
                  <span>Tasks</span>
                  {#if pendingTasks.length > 0}
                    <span class="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs font-mono">
                      {pendingTasks.length} pending
                    </span>
                  {/if}
                  {#if doneTasks.length > 0}
                    <span class="bg-leaf-500/10 text-leaf-500 px-2 py-0.5 rounded-full text-xs font-mono">
                      {doneTasks.length} done
                    </span>
                  {/if}
                </h2>

                <div class="space-y-1.5 mb-3">
                  {#each pendingTasks as task}
                    <div class="flex items-start gap-3 text-sm text-ink-200 group">
                      <button
                              onclick={() => toggleTask(task)}
                              class="mt-0.5 w-4 h-4 border border-ink-500 rounded flex-shrink-0
                               hover:border-leaf-500 transition-colors"></button>
                      <button
                              onclick={() => toggleTask(task)}
                              class="flex-1 text-left hover:text-ink-100 transition-colors">
                        {task.text}
                      </button>

                      {#if task.source === 'sheafbase-tasks.md'}
                        <button
                                onclick={() => deleteTask(task)}
                                class="opacity-0 group-hover:opacity-100 text-ink-600 hover:text-rose-400
     transition-all text-xs px-1 flex-shrink-0">
                          ✕
                        </button>
                      {:else}
                        <button
                                onclick={() => { const f = files.find(x => x.name === task.source); if (f) selectFile(f); }}
                                class="text-ink-500 text-xs font-mono flex-shrink-0 hover:text-leaf-400 transition-colors">
                          {task.source}
                        </button>
                      {/if}
                    </div>
                  {/each}
                  {#each doneTasks as task}
                    <div class="flex items-start gap-3 text-sm text-ink-600 group">
                      <button
                              onclick={() => toggleTask(task)}
                              class="mt-0.5 w-4 h-4 border border-ink-700 rounded flex-shrink-0
                               bg-leaf-500/10 flex items-center justify-center
                               text-leaf-600 text-xs hover:border-ink-500 transition-colors">✓</button>
                      <button
                              onclick={() => toggleTask(task)}
                              class="flex-1 text-left line-through hover:text-ink-500 transition-colors">
                        {task.text}
                      </button>

                      {#if task.source === 'sheafbase-tasks.md'}
                        <button
                                onclick={() => deleteTask(task)}
                                class="opacity-0 group-hover:opacity-100 text-ink-600 hover:text-rose-400
     transition-all text-xs px-1 flex-shrink-0">
                          ✕
                        </button>
                      {:else}
                        <button
                                onclick={() => { const f = files.find(x => x.name === task.source); if (f) selectFile(f); }}
                                class="text-ink-=500 text-xs font-mono flex-shrink-0 hover:text-leaf-400 transition-colors">
                          {task.source}
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>

                <!-- Add task input -->
                <div class="flex items-center gap-2 mt-3 border-t border-ink-800/60 pt-3">
                  <span class="w-4 h-4 border border-ink-600 rounded flex-shrink-0"></span>
                  <input
                          type="text"
                          bind:value={newTaskText}
                          onkeydown={handleTaskKeydown}
                          placeholder="Add a task… (Enter to save)"
                          class="flex-1 bg-transparent text-sm text-ink-300 placeholder-ink-600
                           focus:outline-none focus:placeholder-ink-500 transition-colors"/>
                  {#if newTaskText.trim()}
                    <button
                            onclick={addTask}
                            disabled={addingTask}
                            class="text-xs text-leaf-500 hover:text-leaf-400 font-mono transition-colors px-2">
                      {addingTask ? '…' : '+ add'}
                    </button>
                  {/if}
                </div>
              </div>

              <!-- File metadata -->
              {#if summaryFiles.length > 0}
                <div>
                  <h2 class="text-xs uppercase tracking-widest text-ink-300 mb-3">Files</h2>
                  <div class="space-y-1">
                    {#each summaryFiles as meta}
                      <button
                              onclick={() => { const f = files.find(x => x.name === meta.name); if (f) selectFile(f); }}
                              class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                               bg-ink-900/60 border border-ink-700/60 hover:border-ink-600
                               hover:bg-ink-800/60 transition-all text-left group">
                        <span class="text-ink-500 text-xs w-4">{fileIcon(meta.ext)}</span>
                        <span class="text-ink-200 text-sm flex-1 group-hover:text-leaf-400 transition-colors">{meta.name}</span>
                        {#if meta.wordCount > 0}
                          <span class="text-ink-400 text-xs font-mono">{meta.wordCount} words</span>
                          <span class="text-ink-500 text-xs">·</span>
                          <span class="text-ink-400 text-xs font-mono">{meta.readingMins} min read</span>
                          <span class="text-ink-500 text-xs">·</span>
                        {/if}
                        <span class="text-ink-400 text-xs font-mono">{formatRelTime(meta.modifiedAt)}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}

            </div>
          {/if}
        {/if}
      </div>
    {/if}

  </div>
</div>