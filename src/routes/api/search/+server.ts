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
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { KB_ROOT } from '$lib/server/db';

const MAX_RESULTS = 30;
const SKIP_FILES = new Set(['sheafbase-folder-view.md', 'sheafbase-tasks.md', 'sheafbase-folder-info.json', 'sheafbase-section-info.json']);
const SKIP_DIRS  = new Set(['.pkm', '.git', 'node_modules']);

function sanitize(q: string): string {
  return q.replace(/[^a-zA-Z0-9 \-_.]/g, '').trim();
}

function pathToHref(relPath: string): string {
  const parts = relPath.replace(/^[/\\]/, '').split(/[/\\]/);
  const root = parts[0]?.toLowerCase();
  if (root === 'journal') return `/journal/${parts[1]}/${parts[2]}/${parts[3]}`;
  if (root === 'notes' || root === 'knowledge') return `/${root}/${parts[1]}`;
  return '/' + parts.join('/');
}

function pathToSection(relPath: string): string {
  const parts = relPath.replace(/^[/\\]/, '').split(/[/\\]/);
  const root = parts[0];
  if (root === 'Journal') return `${parts[1]}-${parts[2]}-${parts[3]}`;
  if (root === 'Notes' || root === 'Knowledge') return `${root} / ${parts[1]}`;
  return relPath;
}

interface Result {
  path: string;
  href: string;
  section: string;
  filename: string;
  snippets: string[];
}

function searchFile(absPath: string, relPath: string, terms: string[], tagFilters: string[]): Result | null {
  let text: string;
  try { text = readFileSync(absPath, 'utf8'); } catch { return null; }

  const lower = text.toLowerCase();

  // Check tag filters against frontmatter
  if (tagFilters.length > 0) {
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const fm = fmMatch ? fmMatch[1].toLowerCase() : '';
    if (!tagFilters.every(tag => fm.includes(tag))) return null;
  }

  // Check free text — all terms must appear
  if (terms.length > 0) {
    if (!terms.every(term => lower.includes(term))) return null;
  }

  // Collect up to 2 snippet lines containing the first term
  const snippets: string[] = [];
  if (terms.length > 0) {
    const firstTerm = terms[0];
    for (const line of text.split('\n')) {
      if (snippets.length >= 2) break;
      const trimmed = line.trim();
      if (!trimmed || trimmed === '---' || trimmed.startsWith('tags:')) continue;
      if (trimmed.length > 200) continue;
      if (trimmed.toLowerCase().includes(firstTerm)) snippets.push(trimmed);
    }
  }

  const filename = relPath.split(/[/\\]/).pop() ?? '';

  return {
    path: relPath,
    href: pathToHref(relPath),
    section: pathToSection(relPath),
    filename,
    snippets,
  };
}

function walk(dir: string, kbRoot: string, terms: string[], tagFilters: string[], results: Result[]): void {
  if (results.length >= MAX_RESULTS) return;

  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }

  for (const name of entries) {
    if (results.length >= MAX_RESULTS) return;
    if (name.startsWith('.') || SKIP_DIRS.has(name)) continue;

    const abs = join(dir, name);
    let stat;
    try { stat = statSync(abs); } catch { continue; }

    if (stat.isDirectory()) {
      walk(abs, kbRoot, terms, tagFilters, results);
    } else if (name.endsWith('.md') || name.endsWith('.txt')) {
      if (SKIP_FILES.has(name)) continue;
      const rel = abs.replace(kbRoot, '').replace(/\\/g, '/');
      const result = searchFile(abs, rel, terms, tagFilters);
      if (result) results.push(result);
    }
  }
}

export async function GET({ url }) {
  const raw   = url.searchParams.get('q') ?? '';
  const query = sanitize(raw);
  if (!query) return json({ query: raw, results: [] });

  const tagFilters: string[] = [];
  const freeText = query.replace(/tag:(\S+)/g, (_, tag) => {
    tagFilters.push(tag.toLowerCase());
    return '';
  }).trim();

  const terms = freeText ? freeText.toLowerCase().split(/\s+/).filter(Boolean) : [];

  if (terms.length === 0 && tagFilters.length === 0) {
    return json({ query: raw, results: [] });
  }

  const results: Result[] = [];
  walk(KB_ROOT, KB_ROOT, terms, tagFilters, results);

  return json({ query: raw, results });
}