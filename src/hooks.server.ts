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

import type { Handle } from '@sveltejs/kit';
import { createAuthHandle,  isValidSession, bootstrapPasswordFromEnv, isPasswordSet } from '$lib/sheafgate/auth';
import { assertLocalhostOnly, emitReadySignal } from '$lib/sheafgate/serverInit';

// Security preflight — refuse to start if not bound to localhost
assertLocalhostOnly();
bootstrapPasswordFromEnv();
emitReadySignal();

console.error('[sheafgate] cwd:', process.cwd());
console.error('[sheafgate] password set?', isPasswordSet());

const PUBLIC_PATHS = new Set(['/login', '/sheafgate-control']);

export const handle = createAuthHandle(PUBLIC_PATHS);