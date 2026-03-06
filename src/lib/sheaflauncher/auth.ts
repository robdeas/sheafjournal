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

// Build-time constant injected via vite define from sheaf-launcher-engine.env
import type {Handle} from "@sveltejs/kit";

declare const __PKM_LOGIN_UUID__: string;

export const LOGIN_UUID: string = __PKM_LOGIN_UUID__;

export const SESSION_COOKIE = 'pkm_session';

// ── Session store ─────────────────────────────────────────────────────────────
const sessions = new Set<string>();

export function createSession(): string {
    const id = crypto.randomUUID();
    sessions.add(id);
    return id;
}

export function isValidSession(id: string): boolean {
    return sessions.has(id);
}

export function deleteSession(id: string): void {
    sessions.delete(id);
}

// ── Password ──────────────────────────────────────────────────────────────────
let _password: string | null = null;
const _startTime = Date.now();

export function setPassword(password: string): void {
    _password = password;
}

export function checkPassword(password: string): boolean {
    return _password !== null && password === _password;
}

export function isPasswordSet(): boolean {
    return _password !== null;
}

export function uptimeSeconds(): number {
    return Math.floor((Date.now() - _startTime) / 1000);
}

// ── Password bootstrap ────────────────────────────────────────────────────────
// Called once at server startup from hooks.server.ts.
// In production the Go launcher passes the password via SHEAF_LAUNCHER_PASSWORD.
// In dev (engine run directly) a random password is generated and logged.
export function bootstrapPasswordFromEnv(): void {
    const envPassword = process.env.SHEAF_LAUNCHER_PASSWORD;
    if (envPassword) {
        setPassword(envPassword);
        delete process.env.SHEAF_LAUNCHER_PASSWORD;
        console.error('[sheaflauncher] password set from env');
        return;
    }

    const devPassword = crypto.randomUUID();
    setPassword(devPassword);
    console.error('');
    console.error('⚠️  WARNING: SHEAF_LAUNCHER_PASSWORD not set');
    console.error('⚠️  Running in DEV MODE with random password:', devPassword);
    console.error('⚠️  RUN VIA LAUNCHER APPLICATION');
    console.error('⚠️  Or set SHEAF_LAUNCHER_PASSWORD env var for production');
    console.error('');
}

// src/lib/sheaflauncher/auth.ts — add this:
export function createAuthHandle(publicPaths: Set<string>): Handle {
    return async ({ event, resolve }) => {
        if (publicPaths.has(event.url.pathname)) {
            return resolve(event);
        }

        const sessionId = event.cookies.get(SESSION_COOKIE);
        if (sessionId && isValidSession(sessionId)) {
            return resolve(event);
        }

        return new Response(null, {
            status: 302,
            headers: { location: '/login' },
        });
    };
}