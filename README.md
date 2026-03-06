# SheafJournal

A local-first Personal Knowledge Manager. Standard SvelteKit — one process, one dev command.

## Stack

- **SvelteKit** with `adapter-node` — pages, routing, and API server routes in one project
- **better-sqlite3** — metadata, tags, search index
- **Go (sheaflauncher)** — thin webview shell, spawns the built SvelteKit app

## Development

```bash
bun install
bun run dev
# open http://localhost:5173
```

One terminal. One process. Standard SvelteKit.

## Project structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db.ts           ← SQLite setup, meta queries
│   │   └── filesystem.ts   ← KB folder scanning
│   ├── types.ts            ← shared types and helpers
│   ├── Sidebar.svelte
│   └── Breadcrumbs.svelte
└── routes/
    ├── +layout.svelte
    ├── +page.svelte             ← Home
    ├── +page.server.ts
    ├── health/
    │   └── +server.ts           ← GET /health (Go launcher polls this)
    ├── api/
    │   ├── fs/tree/+server.ts   ← GET /api/fs/tree
    │   ├── fs/node/+server.ts   ← GET /api/fs/node
    │   ├── doc/convert/+server.ts
    │   ├── doc/raw/+server.ts
    │   ├── meta/+server.ts
    │   ├── meta/tags/+server.ts
    │   ├── search/+server.ts
    │   ├── watch/+server.ts     ← SSE filesystem events
    │   └── system/config/+server.ts
    ├── journal/
    │   ├── [year]/[month]/[day]/+page.svelte
    │   └── ...
    └── search/+page.svelte
```

## KB folder structure

```
~/Sheafbase/
├── Journal/
│   └── YYYY/MM/DD/
│       ├── *.md
│       ├── *.docx
│       └── .pkm_assets/
└── .pkm/
    └── pkm_meta.db
```

Set `PKM_ROOT` environment variable to point to a different KB folder.

## Build

```bash
bun run build
# output → build/

# Run the built app
node build/index.js
# or
bun build/index.js
```
