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
  import '../app.css';
  import { page } from '$app/stores';
  import Sidebar from '$lib/Sidebar.svelte';
  import Breadcrumbs from '$lib/Breadcrumbs.svelte';

  $: segments = $page.url.pathname
    .split('/')
    .filter(Boolean)
    .map((s, i, arr) => ({
      label: s,
      href: '/' + arr.slice(0, i + 1).join('/')
    }));
</script>

<div class="flex h-screen overflow-hidden bg-ink-950">
  <Sidebar />
  <div class="flex-1 flex flex-col overflow-hidden">
    {#if segments.length > 0}
      <Breadcrumbs {segments} />
    {/if}
    <main class="flex-1 overflow-y-auto">
      <slot />
    </main>
  </div>
</div>
