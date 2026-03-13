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

import type { RequestHandler } from '@sveltejs/kit';
import {
    LOGIN_UUID,
    SESSION_COOKIE,
    checkPassword,
    isPasswordSet,
    createSession,
    uptimeSeconds,
} from './auth';

function checkUuid(url: URL): boolean {
    return url.searchParams.get('uuid') === LOGIN_UUID;
}

// GET /sheafgate-control?uuid=xxx&password=xxx
// Validates UUID + password, sets session cookie, redirects to /.
export const GET: RequestHandler = ({ url, cookies }) => {
    if (!checkUuid(url)) {
        return new Response('Not found', { status: 404 });
    }

    if (!isPasswordSet()) {
        return new Response(
            '<html><body><p>Server starting — please wait and try again.</p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
        );
    }

    const password = url.searchParams.get('password') ?? '';
    if (!checkPassword(password)) {
        return new Response('Unauthorized', { status: 401 });
    }

    const sessionId = createSession();
    cookies.set(SESSION_COOKIE, sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        // No maxAge — session cookie tied to app lifecycle
    });

    return new Response(null, {
        status: 302,
        headers: { location: '/' },
    });
};

// POST /sheafgate-control?uuid=xxx
// Heartbeat — Go calls this periodically to confirm the app is alive.
export const POST: RequestHandler = ({ url }) => {
    if (!checkUuid(url)) {
        return new Response('Not found', { status: 404 });
    }

    return new Response(
        JSON.stringify({
            status: 'alive',
            uptime: uptimeSeconds(),
            passwordSet: isPasswordSet(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
};

// DELETE /sheafgate-control?uuid=xxx
// Shutdown — Go calls this for clean exit.
export const DELETE: RequestHandler = ({ url }) => {
    if (!checkUuid(url)) {
        return new Response('Not found', { status: 404 });
    }

    setTimeout(() => process.exit(0), 100);

    return new Response(
        JSON.stringify({ status: 'shutting_down' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
};