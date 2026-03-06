// Copyright 2026 Rob Deas
// SPDX-License-Identifier: GPL-3.0-or-later
//
// This file is part of SheafJournal.
//
// SheafJournal is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// SheafJournal is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with SheafJournal. If not, see <https://www.gnu.org/licenses/>.
import { json } from '@sveltejs/kit';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { resolveKbPath } from '$lib/server/db';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// ── Syntax highlighting ───────────────────────────────────────────────────

marked.use(markedHighlight({
  emptyLangClass: 'hljs',
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

// ── Mermaid fenced blocks → <pre class="mermaid"> ────────────────────────

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      if (lang === 'mermaid') {
        return `<pre class="mermaid not-prose">${text}</pre>`;
      }
      return `<pre><code class="hljs language-${lang ?? ''}">${text}</code></pre>`;
    }
  }
});

// ── Frontmatter ───────────────────────────────────────────────────────────

interface Frontmatter {
  tags: string[];
  title?: string;
}

function parseFrontmatter(text: string): { frontmatter: Frontmatter; body: string } {
  const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = text.match(FM_RE);

  if (!match) return { frontmatter: { tags: [] }, body: text };

  const raw = match[1];
  const body = text.slice(match[0].length);

  // Parse tags: supports both
  //   tags: [java, spring]
  //   tags:
  //     - java
  //     - spring
  let tags: string[] = [];

  const inlineTags = raw.match(/^tags:\s*\[([^\]]*)\]/m);
  if (inlineTags) {
    tags = inlineTags[1].split(',').map(t => t.trim()).filter(Boolean);
  } else {
    const blockTags = raw.match(/^tags:\s*\n((?:\s*-\s*.+\n?)*)/m);
    if (blockTags) {
      tags = blockTags[1]
          .split('\n')
          .map(l => l.replace(/^\s*-\s*/, '').trim())
          .filter(Boolean);
    }
  }

  const titleMatch = raw.match(/^title:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  return { frontmatter: { tags, title }, body };
}

// ── Route ─────────────────────────────────────────────────────────────────

export async function POST({ request }) {
  const { path } = await request.json() as { path: string };
  const absPath = resolveKbPath(path);

  if (!existsSync(absPath)) {
    return json({ error: 'File not found' }, { status: 404 });
  }

  const ext = extname(absPath).toLowerCase();

  try {
    switch (ext) {
      case '.md': {
        const { html, tags } = await renderMarkdown(absPath);
        return json({ html, tags, hasMermaid: true });
      }

      case '.txt':
        return json({ html: renderText(absPath), tags: [], hasMermaid: false });

      case '.docx':
      case '.odt':
      case '.doc':
      case '.rtf':
        return json({ html: renderOfficeStub(absPath), tags: [], hasMermaid: false });

      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.webp':
        return json({
          html: `<img src="/api/doc/raw?path=${encodeURIComponent(path)}" class="max-w-full rounded"/>`,
          tags: [],
          hasMermaid: false,
        });

      case '.pdf':
        return json({
          html: `<embed src="/api/doc/raw?path=${encodeURIComponent(path)}" type="application/pdf" class="w-full h-screen"/>`,
          tags: [],
          hasMermaid: false,
        });

      default:
        return json({ error: `Unsupported file type: ${ext}` }, { status: 422 });
    }
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}

async function renderMarkdown(absPath: string): Promise<{ html: string; tags: string[] }> {
  const text = readFileSync(absPath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(text);
  const html = await marked(body);
  return { html, tags: frontmatter.tags };
}

function renderText(absPath: string): string {
  const text = readFileSync(absPath, 'utf8');
  const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  return `<pre class="whitespace-pre-wrap font-mono text-sm text-ink-300">${escaped}</pre>`;
}

function renderOfficeStub(absPath: string): string {
  const name = absPath.split(/[/\\]/).pop() ?? 'document';
  return `
    <div class="p-6 border border-ink-700 rounded-xl text-ink-400 text-sm max-w-md mx-auto mt-12">
      <div class="text-3xl mb-4">📄</div>
      <p class="text-ink-200 font-medium mb-2">${name}</p>
      <p class="text-ink-500 text-xs">LibreOffice rendering coming soon.</p>
      <p class="mt-3 text-xs font-mono text-ink-700 break-all">${absPath}</p>
    </div>
  `;
}