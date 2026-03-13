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

import fs from 'fs';

// ── .env file parser ──────────────────────────────────────────────────────────
// Reads KEY=VALUE format, ignoring comments and blank lines.
export function parseEnvFile(path: string): Record<string, string> {
    const raw = fs.readFileSync(path, 'utf-8');
    return Object.fromEntries(
        raw.split('\n')
            .filter(l => l.trim() && !l.startsWith('#'))
            .map(l => {
                const idx = l.indexOf('=');
                return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
            })
            .filter(([k]) => k)
    );
}

export function requireEnvValue(env: Record<string, string>, key: string): string {
    const value = env[key];
    if (!value) throw new Error(`[sheafgate] ${key} is missing from sheaf-launcher-engine.env`);
    return value;
}

// ── Vite defines ──────────────────────────────────────────────────────────────
// Call from vite.config.ts to inject launcher config as build-time constants.
export function sheafGateLauncherDefines(envFile = './sheafgate-launcher-engine.env') {
    const env = parseEnvFile(envFile);
    return {
        __SHEAFGATE_LOGIN_UUID__: JSON.stringify(requireEnvValue(env, 'SHEAFGATE_LAUNCHER_UUID')),
    };
}