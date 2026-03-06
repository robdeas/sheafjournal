import { Database } from 'bun:sqlite';
import { join } from 'path';
import { mkdirSync } from 'fs';

const KB_ROOT = process.env.PKM_ROOT ?? join(
    process.env.HOME ?? process.env.USERPROFILE ?? '.',
    'Sheafbase'
);

const DB_PATH = process.env.PKM_DB  ?? join(KB_ROOT, '.pkm', 'pkm_meta.db');

// Ensure .pkm directory exists
mkdirSync(join(KB_ROOT, '.pkm'), { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

// bun:sqlite style:
  _db = new Database(DB_PATH, { create: true });
  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS file_meta (
      path        TEXT PRIMARY KEY,
      word_count  INTEGER,
      last_viewed TEXT,
      tags        TEXT DEFAULT '[]',
      created_at  TEXT,
      indexed_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pkm_links (
      source_path TEXT NOT NULL,
      target_path TEXT NOT NULL,
      broken      INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (source_path, target_path)
    );

    CREATE TABLE IF NOT EXISTS conversion_cache (
      source_path  TEXT PRIMARY KEY,
      cache_path   TEXT NOT NULL,
      source_mtime TEXT NOT NULL,
      cached_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  return _db;
}

export function getMeta(path: string) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM file_meta WHERE path = ?').get(path) as any;
  if (!row) return { path, tags: [], lastViewed: null, wordCount: null, createdAt: null };
  return {
    path: row.path,
    wordCount: row.word_count,
    lastViewed: row.last_viewed,
    tags: JSON.parse(row.tags ?? '[]'),
    createdAt: row.created_at,
  };
}

export function setTags(path: string, tags: string[]) {
  const db = getDb();
  db.prepare(`
    INSERT INTO file_meta (path, tags) VALUES (?, ?)
    ON CONFLICT(path) DO UPDATE SET tags = excluded.tags
  `).run(path, JSON.stringify(tags));
}

export function recordViewed(path: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO file_meta (path, last_viewed) VALUES (?, datetime('now'))
    ON CONFLICT(path) DO UPDATE SET last_viewed = datetime('now')
  `).run(path);
}


export function resolveKbPath(relPath: string): string {
  // Strip leading slash and join with KB_ROOT
  return join(KB_ROOT, relPath.replace(/^\//, ''));
}

export { KB_ROOT };
