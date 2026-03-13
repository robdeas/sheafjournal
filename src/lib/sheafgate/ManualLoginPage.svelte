<!--
  Copyright 2026 Rob Deas

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<script lang="ts">
    let uuid = '';
    let password = '';
    let error = false;

    function handleSubmit() {
        if (!uuid.trim() || !password.trim()) {
            error = true;
            return;
        }
        const params = new URLSearchParams({ uuid: uuid.trim(), password: password.trim() });
        window.location.href = `/sheafgate-control?${params.toString()}`;
    }
</script>

<div class="login-wrapper">
    <div class="login-box">
        <h1>SheafJournal</h1>
        <p class="subtitle">Enter your app credentials to continue</p>

        {#if error}
            <p class="error">Please enter both App UUID and Password.</p>
        {/if}

        <label for="uuid">App UUID</label>
        <input
                id="uuid"
                type="text"
                bind:value={uuid}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autocomplete="off"
                spellcheck="false"
        />

        <label for="password">Password</label>
        <input
                id="password"
                type="password"
                bind:value={password}
                placeholder="One-time app password"
                autocomplete="off"
        />

        <button on:click={handleSubmit}>Login</button>
    </div>
</div>

<style>
    .login-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #f4f4f5;
        font-family: system-ui, sans-serif;
    }

    .login-box {
        background: white;
        border: 1px solid #e4e4e7;
        border-radius: 8px;
        padding: 2rem;
        width: 100%;
        max-width: 380px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    h1 {
        margin: 0 0 0.25rem;
        font-size: 1.4rem;
        font-weight: 600;
        color: #18181b;
    }

    .subtitle {
        margin: 0 0 1rem;
        font-size: 0.875rem;
        color: #71717a;
    }

    .error {
        color: #dc2626;
        font-size: 0.875rem;
        margin: 0 0 0.5rem;
    }

    label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #3f3f46;
        margin-top: 0.5rem;
    }

    input {
        padding: 0.5rem 0.75rem;
        border: 1px solid #d4d4d8;
        border-radius: 6px;
        font-size: 0.875rem;
        color: #18181b;
        outline: none;
        transition: border-color 0.15s;
    }

    input:focus {
        border-color: #6366f1;
    }

    button {
        margin-top: 1rem;
        padding: 0.6rem;
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s;
    }

    button:hover {
        background: #4f46e5;
    }
</style>