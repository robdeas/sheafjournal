// Copyright 2026 Rob Deas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// ── Port detection ────────────────────────────────────────────────────────────
// Priority: PORT env var (set by Go launcher) → --port flag → default
export function getPort(): number {
    // PORT is always set by Go launcher — authoritative
    const portEnv = process.env.PORT;
    if (portEnv) {
        const p = parseInt(portEnv);
        if (!isNaN(p)) return p;
    }

    // --port flag for manual testing without launcher
    const args = process.argv;
    const portFlagIndex = args.indexOf('--port');
    if (portFlagIndex !== -1 && args[portFlagIndex + 1]) {
        const p = parseInt(args[portFlagIndex + 1]);
        if (!isNaN(p)) return p;
    }

    // Default — only reached when running engine directly without launcher
    // If this port is busy, use PORT env var or --port flag instead
    return 49200;
}

// ── Run on local host only ──────────────────────────────────────────────────────────────
// The default behaviour of allowing to run on al ports isn't good for security.
// This is a local app only, so we should not allow it to be run on any host.
// serverInit.ts
export function assertLocalhostOnly(): void {
    // Skip check in dev — Vite handles the server, not adapter-node
    if (process.env.NODE_ENV === 'development') return;

    const boundHost = process.env.HOST ?? '0.0.0.0';
    if (boundHost !== '127.0.0.1') {
        console.error('[sheaflauncher] FATAL: HOST must be 127.0.0.1, got:', boundHost);
        console.error('[sheaflauncher] Do not run the engine directly — use the launcher.');
        process.exit(1);
    }
}

// ── Ready signal ──────────────────────────────────────────────────────────────
// Call once at server startup — Go launcher waits for this on stdout.
// Reports actual bound port so Go can open webview on correct URL.
export function emitReadySignal(): void {
    console.log(JSON.stringify({ status: 'ready', port: getPort() }));
}